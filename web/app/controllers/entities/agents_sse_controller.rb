module Entities
  class AgentsSseController < AgentsController
    include Datastar

    # GET /agents/sse/refresh
    # One-request multi-region refresh for the Agents workspace.
    # Patches:
    # - #agents-maincanvas
    # - #rightpanel-base
    # - #rightpanel-overlay (cleared)
    def refresh
      setup_directory_filters!
      load_directory_rows!
      build_sidebar_summary!

      with_sse_stream do |sse|
        main_html = without_view_annotations do
          render_to_string(partial: "entities/agents/workspace_main")
        end

        sidebar_html = without_view_annotations do
          render_to_string(partial: "entities/agents/rightpanel_base")
        end

        clear_overlay_html = '<div id="rightpanel-overlay"></div>'

        patch_elements_by_id(sse, main_html)
        patch_elements_by_id(sse, sidebar_html)
        patch_elements_by_id(sse, clear_overlay_html)
      end
    end

    private

    def without_view_annotations
      original = ActionView::Base.annotate_rendered_view_with_filenames
      ActionView::Base.annotate_rendered_view_with_filenames = false
      yield
    ensure
      ActionView::Base.annotate_rendered_view_with_filenames = original
    end
  end
end
