Rails.application.routes.draw do
  # Health endpoint (200 if app boots).
  get "up" => "rails/health#show", as: :rails_health_check

  # Tools (dense instruments)
  namespace :tools do
    get "salary-book", to: "salary_book#show"
  end

  # Entities (Bricklink-style navigation; clean top-level URLs)
  scope module: :entities do
    get "players", to: "players#index"

    # Numeric fallback (NBA/PCMS shared id) → redirects to canonical slug.
    get "players/:id", to: "players#redirect", constraints: { id: /\d+/ }

    # Canonical route.
    get "players/:slug", to: "players#show", as: :player
  end

  root "tools/salary_book#show"
end
