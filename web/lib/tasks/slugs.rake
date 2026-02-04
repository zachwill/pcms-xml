namespace :slugs do
  desc "Promote a slug to canonical for an entity. Usage: bin/rails slugs:promote[player,2544,lebron]"
  task :promote, [ :entity_type, :entity_id, :slug ] => :environment do |_t, args|
    entity_type = args[:entity_type].to_s.strip.downcase
    slug = args[:slug].to_s.strip.downcase

    if entity_type.empty? || slug.empty? || args[:entity_id].nil?
      abort "Usage: bin/rails slugs:promote[player,2544,lebron]"
    end

    entity_id = Integer(args[:entity_id])

    Slug.transaction do
      existing = Slug.find_by(entity_type: entity_type, slug: slug)

      if existing && existing.entity_id != entity_id
        raise "Slug already taken: #{entity_type} /#{slug} belongs to #{existing.entity_id}"
      end

      # Demote current canonical slug(s) for this entity to aliases.
      Slug.where(entity_type: entity_type, entity_id: entity_id, canonical: true).update_all(canonical: false)

      if existing
        existing.update!(entity_id: entity_id, canonical: true)
      else
        Slug.create!(entity_type: entity_type, entity_id: entity_id, slug: slug, canonical: true)
      end
    end

    puts "Canonical slug for #{entity_type} #{entity_id}: /#{slug}"
  rescue ArgumentError
    abort "entity_id must be an integer"
  end
end
