export const useEmailFinancialHealthScoreReport = () => ({
  mutate: () => {},
  mutateAsync: async () => ({}),
  isPending: false,
  isSuccess: false,
  isError: false,
  isIdle: true,
  error: null,
  reset: () => {},
});

export const useGetPosts = () => ({ data: [], isLoading: false, isError: false });
export const useGetNewsletterSubscribers = () => ({ data: null, isLoading: false });
export const useListServices = () => ({ data: [], isLoading: false });
export const useListPricingPlans = () => ({ data: [], isLoading: false });
export const useListAdminCommissioningTopics = () => ({ data: [], isLoading: false });
export const getGetNewsletterSubscribersQueryKey = () => ["newsletter-subscribers"];
