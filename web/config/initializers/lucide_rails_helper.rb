# Ensure lucide_icon is available in all ActionView contexts.
# (Extra safety on top of lucide-rails' own Railtie.)
ActiveSupport.on_load(:action_view) do
  include LucideRails::RailsHelper if defined?(LucideRails::RailsHelper)
end
