export type TransactionType = 'income' | 'expense';

export type TransactionCategory =
  | 'alimentacao'
  | 'transporte'
  | 'estudos'
  | 'lazer'
  | 'compras'
  | 'contas'
  | 'salario'
  | 'investimento'
  | 'outros';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  theme: 'dark' | 'light';
  accentColor: 'emerald' | 'cyan' | 'amber' | 'violet';
  xp: number;
  level: number;
  levelTitle: string;
  streak: number;
  lastActiveDate: string;
  investorProfile: 'conservador' | 'moderado' | 'arrojado' | null;
  completedChallenges: string[];
  unlockedBadges: string[];
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  category: string;
  status: 'active' | 'paused' | 'completed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  category: 'iniciante' | 'economia' | 'investimento' | 'habito' | 'organizacao';
  xpReward: number;
  icon: string;
  requirementType: 'log_transaction' | 'create_goal' | 'deposit_goal' | 'invest_quiz' | 'streak_3' | 'review_weekly';
  requirementCount: number;
  completed?: boolean;
}

export interface InvestorProfileResult {
  profile: 'conservador' | 'moderado' | 'arrojado';
  title: string;
  description: string;
  recommendedAllocation: {
    label: string;
    percentage: number;
    description: string;
    color: string;
  }[];
}

export interface AdminStats {
  totalUsers: number;
  totalTransactions: number;
  totalGoals: number;
  totalCompletedGoals: number;
  totalXP: number;
  totalChallengesFinished: number;
  activeUsersLast7Days: number;
  serverUptimeHours: number;
}
