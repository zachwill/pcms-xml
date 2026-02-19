class RenameAnalystRoleToFrontOffice < ActiveRecord::Migration[8.1]
  def up
    execute <<~SQL
      UPDATE users
      SET role = 'front_office'
      WHERE role = 'analyst'
    SQL
  end

  def down
    execute <<~SQL
      UPDATE users
      SET role = 'analyst'
      WHERE role = 'front_office'
    SQL
  end
end
