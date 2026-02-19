# Import users from CSV

This is the exact approach we used to bulk add users for auth in `web/`.

## CSV format

Expected header:

```csv
email,password,role
```

Allowed roles:
- `viewer`
- `front_office`

(`fo`, `frontoffice`, and `front-office` are also normalized to `front_office`.)

## Run the import

From repo root:

```bash
cd web
bin/rails runner '
path = ENV.fetch("USERS_CSV", Rails.root.join("users.csv").to_s)
lines = File.readlines(path, chomp: true)
header = lines.shift
expected = "email,password,role"
raise "Unexpected header: #{header.inspect}" unless header&.strip == expected

lines.each do |line|
  next if line.strip.empty?

  email, password, raw_role = line.split(",", 3).map { |value| value.to_s.strip }
  email = email.downcase
  role = User.normalize_role_key(raw_role)

  if email.blank? || password.blank?
    warn "skipped row with missing email/password"
    next
  end

  if role.blank?
    warn "skipped #{email}: invalid role #{raw_role.inspect}"
    next
  end

  user = User.find_or_initialize_by(email: email)
  user.role = role
  user.password = password
  user.save!

  puts "upserted #{email} (#{role})"
end
'
```

To import from a different path, set `USERS_CSV` before running the same command above:

```bash
cd web
USERS_CSV=/secure/path/users.csv bin/rails runner '...script above...'
```

## Notes

- This is **idempotent** for user identity (`find_or_initialize_by(email)`), so reruns are safe.
- Rerunning will **reset passwords** for rows in the CSV.
- Keep CSV files with plaintext passwords out of git and in a secure location.
- This parser assumes values do not contain commas.
