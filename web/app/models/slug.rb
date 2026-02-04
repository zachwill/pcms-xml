class Slug < ApplicationRecord
  SLUG_REGEX = /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/

  before_validation :normalize

  validates :entity_type, presence: true
  validates :entity_id, presence: true

  validates :slug,
    presence: true,
    format: { with: SLUG_REGEX },
    uniqueness: { scope: :entity_type }

  validate :single_canonical_slug, if: :canonical?

  scope :canonical, -> { where(canonical: true) }

  private

  def normalize
    self.entity_type = entity_type.to_s.strip.downcase
    self.slug = slug.to_s.strip.downcase
  end

  def single_canonical_slug
    rel = Slug.where(entity_type: entity_type, entity_id: entity_id, canonical: true)
    rel = rel.where.not(id: id) if persisted?

    return unless rel.exists?

    errors.add(:canonical, "already exists for this entity")
  end
end
