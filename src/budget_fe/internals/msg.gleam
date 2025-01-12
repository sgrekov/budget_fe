import budget_test.{
  type Allocation, type Category, type Cycle, type Money, type Target,
  type Transaction, type User,
} as _
import budget_test.{Allocation, Category, Cycle, Money, Transaction, User}
import gleam/dict
import gleam/option.{type Option}
import lustre_http

pub type Route {
  Home
  TransactionsRoute
  UserRoute
}

pub type Msg {
  OnRouteChange(route: Route)
  Initial(
    users: Result(List(User), lustre_http.HttpError),
    cycle: Cycle,
    initial_route: Route,
  )
  CurrentSavedUser(id: Result(String, Nil))
  Categories(cats: Result(List(Category), lustre_http.HttpError))
  Transactions(trans: Result(List(Transaction), lustre_http.HttpError))
  Suggestions(trans: Result(dict.Dict(String, Category), lustre_http.HttpError))
  Allocations(a: Result(List(Allocation), lustre_http.HttpError))
  SelectCategory(c: Category)
  SelectUser(u: User)
  ShowAddCategoryUI
  UserUpdatedCategoryName(cat_name: String)
  AddCategory
  AddCategoryResult(c: Result(String, lustre_http.HttpError))
  AddTransaction
  UserUpdatedTransactionDate(date: String)
  UserUpdatedTransactionPayee(payee: String)
  UserUpdatedTransactionCategory(cat: String)
  UserUpdatedTransactionAmount(amount: String)
  AddTransactionResult(c: Result(Transaction, lustre_http.HttpError))
  EditTarget(c: Category)
  SaveTarget(c: Category)
  DeleteTarget(c: Category)
  UserTargetUpdateAmount(amount: String)
  EditTargetCadence(is_monthly: Bool)
  UserTargetUpdateCustomDate(date: String)
  CategorySaveTarget(a: Result(String, lustre_http.HttpError))
  SelectTransaction(t: Transaction)
  EditTransaction(t: Transaction, category_name: String)
  UpdateTransaction
  DeleteTransaction(t_id: String)
  TransactionDeleteResult(a: Result(String, lustre_http.HttpError))
  TransactionEditResult(a: Result(String, lustre_http.HttpError))
  UserTransactionEditPayee(p: String)
  UserTransactionEditDate(d: String)
  UserTransactionEditCategory(c: String)
  UserTransactionEditAmount(a: String)
  UserInputCategoryUpdateName(n: String)
  UpdateCategoryName(cat: Category)
  DeleteCategory
  CategoryDeleteResult(a: Result(String, lustre_http.HttpError))
  SaveAllocation(allocation: Option(Allocation))
  SaveAllocationResult(Result(String, lustre_http.HttpError))
  UserAllocationUpdate(amount: String)
  CycleShift(shift: CycleShift)
  UserInputShowAllTransactions(show: Bool)
  AllocateNeeded(cat: Category, needed_amount: Money, alloc: Option(Allocation))
  CoverOverspent(cat: Category, balance: Money)
}

pub type Model {
  Model(
    current_user: User,
    all_users: List(User),
    cycle: Cycle,
    route: Route,
    cycle_end_day: Option(Int),
    show_all_transactions: Bool,
    categories: List(Category),
    transactions: List(Transaction),
    allocations: List(Allocation),
    selected_category: Option(SelectedCategory),
    show_add_category_ui: Bool,
    user_category_name_input: String,
    transaction_add_input: TransactionForm,
    target_edit: TargetEdit,
    selected_transaction: Option(String),
    transaction_edit_form: Option(TransactionEditForm),
    suggestions: dict.Dict(String, Category),
  )
}

pub type SelectedCategory {
  SelectedCategory(id: String, input_name: String, allocation: String)
}

pub type TransactionForm {
  TransactionForm(
    date: String,
    payee: String,
    category: Option(Category),
    amount: Option(Money),
    is_inflow: Bool,
  )
}

pub type CycleShift {
  ShiftLeft
  ShiftRight
}

pub type TransactionEditForm {
  TransactionEditForm(
    id: String,
    date: String,
    payee: String,
    category_name: String,
    amount: String,
  )
}

pub type TargetEdit {
  TargetEdit(cat_id: String, enabled: Bool, target: Target)
}
// pub type AllocationEffectResult {
//   AllocationEffectResult(alloc: Allocation, is_created: Bool)
// }
