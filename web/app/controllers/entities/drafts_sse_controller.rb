module Entities
  class DraftsSseController < DraftsController
    include Datastar

    # GET /drafts/sse/refresh
    # One-request multi-region refresh for drafts index controls.
    # Patches:
    # - #drafts-results
    # - #rightpanel-base
    # - #rightpanel-overlay (cleared)
    def refresh
      load_index_state!

      with_sse_stream do |sse|
        main_html = without_view_annotations do
          render_to_string(partial: "entities/drafts/results")
        end

        sidebar_html = without_view_annotations do
          render_to_string(partial: "entities/drafts/rightpanel_base")
        end

        clear_overlay_html = '<div id="rightpanel-overlay"></div>'

        patch_elements_by_id(sse, main_html)
        patch_elements_by_id(sse, sidebar_html)
        patch_elements_by_id(sse, clear_overlay_html)
        patch_signals(
          sse,
          draftview: @view,
          draftyear: @year.to_s,
          draftround: @round.to_s,
          draftteam: @team.to_s,
          overlaytype: "none",
          overlaykey: ""
        )
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
