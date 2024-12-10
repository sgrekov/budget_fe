import birl.{type Day}
import gleam/option.{type Option, None, Some}

pub type User {
  User(id: String, name: String)
}

pub type Category {
  Category(id: String, name: String, assigned: Money, target: Option(Target))
}

pub type Money {
  Money(sign: Int, base: Int)
}

pub type Target {
  Monthly(target: Money)
  Custom(target: Money, date: MonthInYear)
}

pub type MonthInYear {
  MonthInYear(month: Int, year: Int)
}

pub type Allocation {
  Allocation(amount: Money, catogory_id: String, target: Target)
}

pub type Transaction {
  Transaction(
    id: String,
    date: Day,
    payee: String,
    category_id: String,
    value: Money,
    is_inflow: Bool,
  )
}
