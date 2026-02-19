# Persist auth sessions for ~3 months so users don't need to re-login frequently.
#
# IMPORTANT: cookie signatures depend on SECRET_KEY_BASE.
# If SECRET_KEY_BASE changes between deploys, all sessions are invalidated.
Rails.application.config.session_store :cookie_store,
  key: "_web_session",
  expire_after: 90.days,
  same_site: :lax,
  secure: Rails.env.production?,
  httponly: true
