require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "at_least_role? uses role hierarchy and aliases" do
    viewer = users(:viewer)
    admin = users(:admin)

    assert viewer.at_least_role?(:viewer)
    assert_not viewer.at_least_role?(:front_office)

    assert admin.at_least_role?(:admin)
    assert admin.at_least_role?(:front_office)

    assert admin.at_least_role?(:fo)
    assert admin.at_least_role?("front-office")
    assert_not admin.at_least_role?(:analyst)
  end
end
