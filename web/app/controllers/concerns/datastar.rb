# Datastar SSE helpers for Rails controllers.
#
# Include this concern in any controller that needs to send SSE responses
# to Datastar. Provides the framing helpers for patch-elements and patch-signals.
#
# Usage:
#   class MyController < ApplicationController
#     include Datastar
#
#     def update
#       with_sse_stream do |sse|
#         patch_elements(sse, selector: "#flash", html: "<div>Done</div>")
#         patch_signals(sse, status: "complete")
#       end
#     end
#   end
#
module Datastar
  extend ActiveSupport::Concern

  included do
    include ActionController::Live
  end

  private

  # Sets up SSE headers and yields an SSE writer. Handles cleanup automatically.
  #
  # @yield [ActionController::Live::SSE] the SSE stream writer
  def with_sse_stream(retry_ms: 5_000)
    setup_sse_headers!
    sse = ActionController::Live::SSE.new(response.stream, retry: retry_ms)

    begin
      yield sse
    rescue ActionController::Live::ClientDisconnected
      # Client navigated away or closed tab — nothing to do
    ensure
      sse.close
    end
  end

  # Patches one or more signals into the frontend.
  #
  # @param sse [ActionController::Live::SSE]
  # @param signals [Hash] signal key/value pairs
  def patch_signals(sse, **signals)
    sse.write("signals #{signals.to_json}", event: "datastar-patch-signals")
  end

  # Patches HTML into a specific selector.
  #
  # @param sse [ActionController::Live::SSE]
  # @param selector [String] CSS selector (e.g., "#flash", "#rightpanel-overlay")
  # @param html [String] rendered HTML
  # @param mode [String] patch mode: inner, outer, replace, prepend, append, before, after, remove
  def patch_elements(sse, selector:, html:, mode: "inner")
    payload = datastar_elements_payload(selector:, html:, mode:)
    sse.write(payload, event: "datastar-patch-elements")
  end

  # Patches HTML using morph-by-id (no selector needed — Datastar matches on top-level `id` attrs).
  #
  # @param sse [ActionController::Live::SSE]
  # @param html [String] rendered HTML (must have top-level element with `id` attribute)
  def patch_elements_by_id(sse, html)
    payload = datastar_elements_by_id_payload(html)
    sse.write(payload, event: "datastar-patch-elements")
  end

  # Convenience: patch #flash region.
  def patch_flash(sse, message)
    html = "<div id=\"flash\">#{ERB::Util.h(message)}</div>"
    patch_elements_by_id(sse, html)
  end

  # -------------------------------------------------
  # Low-level payload builders (also usable standalone)
  # -------------------------------------------------

  def datastar_elements_payload(selector:, html:, mode: "inner")
    [
      "mode #{mode}",
      "selector #{selector}",
      *html.lines.map { |l| "elements #{l.chomp}" },
    ].join("\n")
  end

  def datastar_elements_by_id_payload(html)
    html.lines.map { |l| "elements #{l.chomp}" }.join("\n")
  end

  def setup_sse_headers!
    response.headers["Content-Type"] = "text/event-stream; charset=utf-8"
    response.headers["Cache-Control"] = "no-cache, no-transform"
    response.headers["X-Accel-Buffering"] = "no" # nginx
    response.headers["Last-Modified"] = Time.now.httpdate
    response.headers.delete("ETag")
  end
end
