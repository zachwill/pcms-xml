class User < ApplicationRecord
  ROLES = %w[viewer front_office admin].freeze
  ROLE_PRIORITY = ROLES.each_with_index.to_h.freeze
  FRONT_OFFICE_ALIASES = %w[fo frontoffice front_office front-office].freeze

  has_secure_password

  normalizes :email, with: ->(value) { value.to_s.strip.downcase }

  before_validation :normalize_role!

  validates :email,
    presence: true,
    format: { with: URI::MailTo::EMAIL_REGEXP },
    uniqueness: { case_sensitive: false }
  validates :role, presence: true, inclusion: { in: ROLES }

  def at_least_role?(required_role)
    required_key = self.class.normalize_role_key(required_role)
    required_rank = ROLE_PRIORITY[required_key]
    return false if required_rank.nil?

    ROLE_PRIORITY.fetch(role, -1) >= required_rank
  end

  def self.normalize_role_key(value)
    key = value.to_s.strip.downcase
    key = key.tr("-", "_")

    return "front_office" if FRONT_OFFICE_ALIASES.include?(value.to_s.strip.downcase) || %w[front_office frontoffice].include?(key)

    ROLES.include?(key) ? key : nil
  end

  private

  def normalize_role!
    self.role = self.class.normalize_role_key(role)
  end
end
