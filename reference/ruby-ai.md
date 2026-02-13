# AI Agent Orchestration on Rails

https://jessewaites.com/blog/post/ai-agent-orchestration-on-rails/

Most AI integrations stop at chat. You wire up an LLM, stream some tokens to a text box, and call it a day. But what if you want agents that actually *do things* — send emails, query databases, book meetings, delegate work to other agents?

I built a project I call Jarvis to find out: a platform where specialized AI agents use real tools to perform real tasks, all built on Ruby on Rails.

## User Experience

I ask Jarvis to do multi-step tasks, and it just does it. I can type “Hey Jarvis… think up 20 domain names that start with the letter X, check their availability, then email me the available ones.” Jarvis breaks this task down into atomic units, and its orchestrator agent plans and executes the whole process end-to-end, calling the right tools, skills, and sub-agents along the way. The next thing I know I have a list of available domain names in my email inbox. Here’s how I built it.

## The Stack

Jarvis runs on **Rails 8** with [RubyLLM](https://github.com/crmne/ruby_llm) handling all LLM interactions. RubyLLM gives us three ActiveRecord mixins that make persistence nearly free:

- `acts_as_chat` — a conversation with model, system prompt, and tool configuration
- `acts_as_message` — individual messages within a chat
- `acts_as_tool_call` — records of every tool invocation the LLM makes

Real-time streaming comes from **Hotwire** (Turbo Streams over Solid Cable), and background jobs run on **Solid Queue**. No Redis, no Node, no Webpack. Just Rails.

## Agents — Specialized Workers

Every agent in Jarvis subclasses `BaseAgent` and implements two methods: `#system_prompt` (what the agent knows and how it behaves) and `#tools` (what it can do).

```ruby
class BaseAgent
  attr_reader :chat

  def initialize(chat)
    @chat = chat
  end

  def run(user_message)
    if chat
      setup_chat
      chat.ask(user_message).content
    else
      llm = RubyLLM.chat(model: DEFAULT_MODEL)
      llm.with_instructions(full_system_prompt)
      llm.with_tools(*tools_for_chat)
      llm.ask(user_message).content
    end
  end

  # Subclasses implement these:
  def system_prompt = raise NotImplementedError
  def tools = raise NotImplementedError
end
```

The key design decision: Each conversation begins by talking to The Orchestrator, who then delegates tasks to specialized sub-agents. The Email Agent can send emails. The Research Agent can search the web and query databases. The Scheduling Agent can check calendars and book meetings. No agent gets every tool — this constrains behavior and makes task delegation much more predictable.

Here’s sample code from The Orchestrator, the entry point for all user requests:

```ruby
class OrchestratorAgent < BaseAgent
  def system_prompt
    <<~PROMPT
      You are the orchestrator agent. You analyze user requests and either
      handle them directly or delegate to specialist agents.

      Available specialists:
      - ResearchAgent: web search, PDF analysis, database queries
      - DataAnalysisAgent: PDF analysis and database queries
      - SchedulingAgent: calendar management, meeting negotiation, booking
    PROMPT
  end

  def skills
    [InterviewSkill, SentimentAnalysisSkill]
  end

  def tools
    [DelegateToAgentTool, EmailTool, SmsTool, SendTelegramMessageTool,
     DomainCheckerTool, WeatherForecastTool, AskUserTool,
     InterviewUserTool, CreateEmailMonitorTool]
  end
end
```

## Tools — What Agents Can Actually Do

Tools are where agents meet the real world. Each tool subclasses `RubyLLM::Tool`, declares its parameters, and implements `#execute`. The convention: return data hashes on success, `{ error: "..." }` for recoverable failures. Never raise for expected errors — let the agent handle it gracefully.

```ruby
class EmailTool < RubyLLM::Tool
  description "Sends an email via the application mailer."

  param :to, desc: "Recipient email address"
  param :subject, desc: "Email subject line"
  param :body, desc: "Plain text email body"

  def execute(to:, subject:, body:)
    unless to.match?(/\A[^@\s]+@[^@\s]+\z/)
      return { error: "Invalid email address: #{to}" }
    end

    AgentMailer.agent_email(to: to, subject: subject, body: body).deliver_later
    { sent: true, to: to, subject: subject }
  rescue => e
    { error: "Failed to send: #{e.message}" }
  end
end
```

That’s the entire email tool. `param` declarations tell the LLM what arguments to provide, and RubyLLM handles the function-calling protocol automatically. The LLM sees the tool description, decides when to use it, and passes structured arguments. Your `#execute` method just does the work.

So far Jarvis has 19 tools spanning email, SMS, Telegram, web search, PDF reading, database queries (read-only against a few of my side-project Postgres databases), Google Calendar availability (I set it up so Jarvis can read my Google Calendar schedule but not yet write to it), domain name availibility lookups, weather, and more.

## The Orchestrator — Delegation as a First-Class Primitive

IMO the most interesting tool is `DelegateToAgentTool`. When the orchestrator encounters a complex request — say, “research our competitor’s pricing and email me a summary” — it doesn’t try to do everything itself. It delegates.

```ruby
class DelegateToAgentTool < RubyLLM::Tool
  description "Delegates a subtask to another agent."

  param :agent_type, desc: "Agent class name (e.g. ResearchAgent)"
  param :message, desc: "The task or question to send to the sub-agent"

  ALLOWED_AGENTS = %w[ResearchAgent DataAnalysisAgent SchedulingAgent].freeze

  def execute(agent_type:, message:)
    unless ALLOWED_AGENTS.include?(agent_type)
      return { error: "Unknown agent: #{agent_type}" }
    end

    task = create_task(agent_type, message)
    agent = agent_type.constantize.new(nil)
    result = agent.run(message)

    complete_task(task)
    { response: result }
  rescue => e
    fail_task(task, e.message)
    { error: "Agent failed: #{e.message}" }
  end
end
```

Sub-agents run **ephemerally** — they don’t persist conversation history. They spin up, do their job, return a result, and disappear. But every delegation is tracked as a `Task` record, giving us full visibility into what happened.

This enables multi-step workflows. The orchestrator might delegate research to `ResearchAgent`, get the findings back, then delegate scheduling to `SchedulingAgent` based on those findings, then send an email with the results via the CommunicationAgent subagent, which is allowed to use SendEmailTool and SendSMSTool.

## Skills — Pluggable Behavior

Sometimes you want to modify how an agent behaves without creating a new agent subclass. You also want these abilities to be modular so different agents can use them. That’s what skills are for. In Jarvis, a skill is a prompt mixin — extra instructions appended to the agent’s system prompt.

The orchestrator uses `InterviewSkill` (which teaches it to ask clarifying questions before acting) and `SentimentAnalysisSkill` (for routing inbound emails by tone). Skills compose — you can stack multiple skills on any agent without changing its core logic.

## Real-Time UX with Hotwire

When a user sends a message, the controller enqueues an `AgentRunJob` and returns immediately. The job runs the agent in the background, streaming LLM tokens to the browser via Turbo Streams:

```ruby
class AgentRunJob < ApplicationJob
  def perform(chat_id)
    chat = Chat.find(chat_id)

    task = chat.tasks.create!(status: "queued", agent_type: chat.agent_type, ...)
    task.update!(status: "running", started_at: Time.current)

    chat.agent.continue do |chunk|
      if chunk.content.present? && assistant_msg
        assistant_msg.broadcast_append_chunk(chunk.content)
      end
    end

    task.update!(status: "completed", completed_at: Time.current)
  end
end
```

The user sees the response building character by character. Task status updates broadcast in real-time too — you can watch a task go from queued to running to completed as the agent works. No polling, no WebSocket boilerplate. Just Turbo.

## Verifying Agent Behavior — Tool Visibility

Here’s something I think matters a lot: **you should be able to see exactly which tools an agent used during a run**. Not just what it said — what it *did*.

Every `Task` record reports exactly which tools were invoked during its execution window:

```ruby
class Task < ApplicationRecord
  def tool_names
    return [] unless started_at
    ToolCall.joins(:message)
      .where(messages: { chat_id: chat_id })
      .where(messages: { created_at: started_at..(completed_at || Time.current) })
      .distinct
      .pluck(:name)
  end
end
```

This queries the `ToolCall` records (persisted automatically by RubyLLM’s `acts_as_tool_call`) that fall within the task’s time window. The task page renders these as badges:

```erb
<% if (tools = task.tool_names).any? %>
  <div class="flex flex-wrap gap-1 mt-1">
    <p class="text-xs">Tools used:</p>
    <% tools.each do |name| %>
      <span class="text-xs px-1.5 py-0.5 border">
        <%= name.camelize %>
      </span>
    <% end %>
  </div>
<% end %>
```

When you ask “research and email me available domain names” you can see on the task show page that the agent actually used `DomainCheckerTool` and `SendEmailTool` — it didn’t just make something up.

This is trust-but-verify for AI agents. The tool badges are a quick visual check: did the agent do what it claimed to do? If an agent says “I searched for that and found nothing” but `WebSearchTool` doesn’t appear in the tool list, something’s wrong. It’s a simple pattern, but tool use visibility drastically increases how much a human can trust AI Agent output.

## Rails Fits Better Than You’d Think

There is a pretty natural mapping between Rails conventions and agent orchestration:

- **Models** are agents and tasks
- **Jobs** handle the async ai agent orchestration loop
- **Tools** are plain Ruby classes with a standard interface
- **Turbo Streams** give you real-time updates without a separate WebSocket layer
- **ActiveRecord** persistence comes free via RubyLLM’s mixins

You don’t need a separate orchestration framework, a vector database, or a complex pipeline system. Rails already has background jobs, WebSockets, database persistence, and a clean MVC structure. Convention over configuration turns out to apply to AI agents too.

The entire system is about 19 tools, 4 agents, a handful of skills, and one background job class that ties it all together. It’s not a specialized proprietary agentic framework, it’s just a normal Rails app that happens to orchestrate AI agents, and that’s kind of remarkable.

---

*Jarvis was built with [RubyLLM](https://github.com/crmne/ruby_llm) — a Ruby-first interface to modern LLMs with built-in tool calling, streaming, and Rails integration.*
