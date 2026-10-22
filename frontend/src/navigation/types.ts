export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  AddLoan: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
