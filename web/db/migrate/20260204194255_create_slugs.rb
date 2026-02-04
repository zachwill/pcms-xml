class CreateSlugs < ActiveRecord::Migration[8.1]
  def change
    create_table :slugs do |t|
      t.string :entity_type, null: false
      t.bigint :entity_id, null: false
      t.string :slug, null: false
      t.boolean :canonical, null: false, default: false

      t.timestamps
    end

    add_index :slugs, [ :entity_type, :slug ], unique: true
    add_index :slugs, [ :entity_type, :entity_id ]

    # Allow "alias" slugs, but enforce a single canonical slug per entity.
    add_index :slugs, [ :entity_type, :entity_id ],
      unique: true,
      where: "canonical",
      name: "index_slugs_on_entity_type_and_entity_id_canonical"
  end
end
