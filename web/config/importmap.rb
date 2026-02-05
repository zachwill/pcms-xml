# frozen_string_literal: true

# Pin npm packages by running ./bin/importmap
pin "application", preload: true

# Salary Book tool
pin "tools/salary_book", to: "tools/salary_book.js"
