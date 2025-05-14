import budget_shared.{
  type Allocation, type Category, type CategoryGroup, type Cycle, type Money,
  type Transaction, type User,
}
import formal/form
import gleam/dict
import gleam/option.{type Option}
import lustre_http

pub type Route {
  Home
  TransactionsRoute
  ImportTransactions
}

pub type Msg {
  OnRouteChange(route: Route)
  LoginPassword(login: Option(String), pass: Option(String))
  LoginSubmit
  LoginResult(
    user: Result(#(User, String), lustre_http.HttpError),
    cycle: Cycle,
  )
  Categories(cats: Result(List(Category), lustre_http.HttpError))
  Transactions(trans: Result(List(Transaction), lustre_http.HttpError))
  Suggestions(trans: Result(dict.Dict(String, Category), lustre_http.HttpError))
  Allocations(a: Result(List(Allocation), lustre_http.HttpError))
  SelectCategory(c: Category)
  ShowAddCategoryUI(group_id: String)
  UserUpdatedCategoryName(cat_name: String)
  AddCategory(group_id: String)
  AddCategoryResult(c: Result(String, lustre_http.HttpError))
  AddTransaction
  UserUpdatedTransactionDate(date: String)
  UserUpdatedTransactionPayee(payee: String)
  UserUpdatedTransactionCategory(cat: String)
  UserUpdatedTransactionAmount(amount: String)
  UserUpdatedTransactionIsInflow(is_inflow: Bool)
  AddTransactionResult(c: Result(Transaction, lustre_http.HttpError))
  StartEditTarget(c: Category)
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
  UserEditTransactionIsInflow(is_inflow: Bool)
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
  ShowAddCategoryGroupUI
  UserUpdatedCategoryGroupName(name: String)
  CreateCategoryGroup
  AddCategoryGroupResult(c: Result(String, lustre_http.HttpError))
  CategoryGroups(c: Result(List(CategoryGroup), lustre_http.HttpError))
  ChangeGroupForCategory(cat: Category)
  UserInputCategoryGroupChange(group_name: String)
  CollapseGroup(group: CategoryGroup)
  UserSubmittedImportForm(List(#(String, String)))
}

pub type Model {
  Model(
    login_form: LoginForm,
    current_user: Option(User),
    cycle: Cycle,
    route: Route,
    cycle_end_day: Option(Int),
    show_all_transactions: Bool,
    categories_groups: List(CategoryGroup),
    categories: List(Category),
    transactions: List(Transaction),
    allocations: List(Allocation),
    selected_category: Option(SelectedCategory),
    show_add_category_ui: Option(String),
    user_category_name_input: String,
    transaction_add_input: TransactionForm,
    target_edit_form: option.Option(TargetEditForm),
    selected_transaction: Option(String),
    transaction_edit_form: Option(TransactionEditForm),
    suggestions: dict.Dict(String, Category),
    show_add_category_group_ui: Bool,
    new_category_group_name: String,
    category_group_change_input: String,
    import_form: ImportForm,
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
    amount: String,
    is_inflow: Bool,
  )
}

pub type LoginForm {
  LoginForm(login: Option(String), pass: Option(String), is_loading: Bool)
}

pub type ImportForm {
  ImportForm(form: form.Form)
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
    is_inflow: Bool,
  )
}

pub type TargetEditForm {
  TargetEditForm(
    cat_id: String,
    target_amount: String,
    target_custom_date: Option(String),
    is_custom: Bool,
  )
}
