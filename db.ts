import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Transaction, Goal, Challenge, AdminStats } from '../src/types/index.ts';

export interface InternalUser {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  avatar: string;
  theme: 'dark' | 'light';
  accentColor: 'emerald' | 'cyan' | 'amber' | 'violet';
  xp: number;
  streak: number;
  lastActiveDate: string;
  failedLoginAttempts: number;
  lockedUntil: number | null;
  investorProfile: 'conservador' | 'moderado' | 'arrojado' | null;
  completedChallenges: string[];
  unlockedBadges: string[];
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

interface DatabaseSchema {
  users: Record<string, InternalUser>;
  sessions: Record<string, Session>;
  transactions: Record<string, Transaction>;
  goals: Record<string, Goal>;
  challenges: Challenge[];
  adminSettings: {
    announcements: string[];
    maintenanceMode: boolean;
    xpMultiplier: number;
  };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'granaxp.json');

const INITIAL_CHALLENGES: Challenge[] = [
  {
    id: 'c1',
    title: 'Primeiro Passo no Jogo',
    description: 'Cadastre sua primeira movimentação financeira (entrada ou saída).',
    category: 'iniciante',
    xpReward: 30,
    icon: 'compass',
    requirementType: 'log_transaction',
    requirementCount: 1,
  },
  {
    id: 'c2',
    title: 'Mapeando o Território',
    description: 'Registre 5 movimentações para entender onde sua grana é gasta.',
    category: 'organizacao',
    xpReward: 60,
    icon: 'map',
    requirementType: 'log_transaction',
    requirementCount: 5,
  },
  {
    id: 'c3',
    title: 'Cofre do Futuro',
    description: 'Crie sua primeira meta financeira para um objetivo real.',
    category: 'economia',
    xpReward: 50,
    icon: 'target',
    requirementType: 'create_goal',
    requirementCount: 1,
  },
  {
    id: 'c4',
    title: 'Primeiro Aporte',
    description: 'Guarde dinheiro e faça seu primeiro aporte em uma de suas metas.',
    category: 'economia',
    xpReward: 45,
    icon: 'piggy-bank',
    requirementType: 'deposit_goal',
    requirementCount: 1,
  },
  {
    id: 'c5',
    title: 'Mente de Investidor',
    description: 'Faça o Quiz de Investimentos e descubra seu perfil de investidor.',
    category: 'investimento',
    xpReward: 75,
    icon: 'trending-up',
    requirementType: 'invest_quiz',
    requirementCount: 1,
  },
  {
    id: 'c6',
    title: 'Constância de Ferro',
    description: 'Mantenha um streak ativo de pelo menos 3 dias consecutivos.',
    category: 'habito',
    xpReward: 100,
    icon: 'flame',
    requirementType: 'streak_3',
    requirementCount: 3,
  },
];

class Database {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;
  private startTime = Date.now();

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          users: parsed.users || {},
          sessions: parsed.sessions || {},
          transactions: parsed.transactions || {},
          goals: parsed.goals || {},
          challenges: parsed.challenges?.length ? parsed.challenges : INITIAL_CHALLENGES,
          adminSettings: parsed.adminSettings || {
            announcements: ['Bem-vindo ao GranaXP! Suba de nível cuidando da sua grana.'],
            maintenanceMode: false,
            xpMultiplier: 1,
          },
        };
      }
    } catch (err) {
      console.warn('Erro ao carregar banco de dados persistente, iniciando novo:', err);
    }

    return {
      users: {},
      sessions: {},
      transactions: {},
      goals: {},
      challenges: INITIAL_CHALLENGES,
      adminSettings: {
        announcements: ['Bem-vindo ao GranaXP! Suba de nível cuidando da sua grana.'],
        maintenanceMode: false,
        xpMultiplier: 1,
      },
    };
  }

  private persist() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      try {
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        const tempPath = `${DATA_FILE}.tmp.${Date.now()}`;
        fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
        fs.renameSync(tempPath, DATA_FILE);
      } catch (err) {
        console.error('Erro ao gravar banco de dados:', err);
      }
    }, 200);
  }

  public getLevelInfo(xp: number): { level: number; title: string; minXp: number; nextLevelXp: number } {
    if (xp < 200) {
      return { level: 1, title: 'Iniciante', minXp: 0, nextLevelXp: 200 };
    } else if (xp < 500) {
      return { level: 2, title: 'Explorador', minXp: 200, nextLevelXp: 500 };
    } else if (xp < 1000) {
      return { level: 3, title: 'Estrategista', minXp: 500, nextLevelXp: 1000 };
    } else if (xp < 2000) {
      return { level: 4, title: 'Planejador', minXp: 1000, nextLevelXp: 2000 };
    } else {
      return { level: 5, title: 'Mestre da Grana', minXp: 2000, nextLevelXp: 5000 };
    }
  }

  // --- Auth & Users ---
  public getUserByUsername(username: string): InternalUser | undefined {
    const normalized = username.trim().toLowerCase();
    return Object.values(this.data.users).find(
      (u) => u.username.toLowerCase() === normalized
    );
  }

  public getUserById(id: string): InternalUser | undefined {
    return this.data.users[id];
  }

  public createUser(username: string, passwordHash: string, displayName?: string): InternalUser {
    const id = 'usr_' + crypto.randomBytes(8).toString('hex');
    const today = new Date().toISOString().split('T')[0];

    const newUser: InternalUser = {
      id,
      username: username.trim().toLowerCase(),
      displayName: displayName?.trim() || username.trim(),
      passwordHash,
      avatar: 'gamer',
      theme: 'dark',
      accentColor: 'emerald',
      xp: 50, // Bônus de boas-vindas
      streak: 1,
      lastActiveDate: today,
      failedLoginAttempts: 0,
      lockedUntil: null,
      investorProfile: null,
      completedChallenges: [],
      unlockedBadges: ['primeiro_acesso'],
      createdAt: new Date().toISOString(),
    };

    this.data.users[id] = newUser;
    this.persist();
    return newUser;
  }

  public recordLoginAttempt(user: InternalUser, success: boolean): boolean {
    if (success) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      this.updateStreakAndActivity(user.id);
    } else {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        // Bloqueia temporariamente por 15 minutos
        user.lockedUntil = Date.now() + 15 * 60 * 1000;
      }
    }
    this.persist();
    return success;
  }

  public updateStreakAndActivity(userId: string): number {
    const user = this.data.users[userId];
    if (!user) return 0;

    const today = new Date().toISOString().split('T')[0];
    if (user.lastActiveDate === today) {
      return user.streak;
    }

    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    if (user.lastActiveDate === yesterday) {
      user.streak = (user.streak || 1) + 1;
      // Recompensa de streak
      if (user.streak === 3 && !user.completedChallenges.includes('c6')) {
        this.completeChallenge(userId, 'c6');
      }
    } else {
      // Perdeu streak, reinicia para 1
      user.streak = 1;
    }

    user.lastActiveDate = today;
    this.persist();
    return user.streak;
  }

  public updateUserProfile(
    userId: string,
    updates: Partial<Pick<InternalUser, 'displayName' | 'avatar' | 'theme' | 'accentColor'>>
  ): InternalUser | null {
    const user = this.data.users[userId];
    if (!user) return null;

    if (updates.displayName !== undefined) user.displayName = updates.displayName.trim();
    if (updates.avatar !== undefined) user.avatar = updates.avatar;
    if (updates.theme !== undefined) user.theme = updates.theme;
    if (updates.accentColor !== undefined) user.accentColor = updates.accentColor;

    this.persist();
    return user;
  }

  public awardXP(userId: string, amount: number, reason?: string): { newXp: number; levelUp: boolean } {
    const user = this.data.users[userId];
    if (!user) return { newXp: 0, levelUp: false };

    const multiplier = this.data.adminSettings.xpMultiplier || 1;
    const finalAmount = Math.round(amount * multiplier);

    const oldLevel = this.getLevelInfo(user.xp).level;
    user.xp = (user.xp || 0) + finalAmount;
    const newLevel = this.getLevelInfo(user.xp).level;

    this.persist();
    return {
      newXp: user.xp,
      levelUp: newLevel > oldLevel,
    };
  }

  public deleteUserAccount(userId: string): boolean {
    if (!this.data.users[userId]) return false;

    // Remove user
    delete this.data.users[userId];

    // Remove all sessions
    Object.keys(this.data.sessions).forEach((sessId) => {
      if (this.data.sessions[sessId].userId === userId) {
        delete this.data.sessions[sessId];
      }
    });

    // Remove all transactions
    Object.keys(this.data.transactions).forEach((txId) => {
      if (this.data.transactions[txId].userId === userId) {
        delete this.data.transactions[txId];
      }
    });

    // Remove all goals
    Object.keys(this.data.goals).forEach((goalId) => {
      if (this.data.goals[goalId].userId === userId) {
        delete this.data.goals[goalId];
      }
    });

    this.persist();
    return true;
  }

  // --- Sessions ---
  public createSession(userId: string): string {
    const sessionId = 'ses_' + crypto.randomBytes(24).toString('hex');
    const now = Date.now();
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 dias

    this.data.sessions[sessionId] = {
      id: sessionId,
      userId,
      createdAt: now,
      expiresAt,
    };

    this.persist();
    return sessionId;
  }

  public getSession(sessionId: string): Session | null {
    const session = this.data.sessions[sessionId];
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      delete this.data.sessions[sessionId];
      this.persist();
      return null;
    }

    return session;
  }

  public deleteSession(sessionId: string): void {
    if (this.data.sessions[sessionId]) {
      delete this.data.sessions[sessionId];
      this.persist();
    }
  }

  // --- Transactions ---
  public getTransactions(userId: string): Transaction[] {
    return Object.values(this.data.transactions)
      .filter((t) => t.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public createTransaction(
    userId: string,
    data: Omit<Transaction, 'id' | 'userId' | 'createdAt'>
  ): Transaction {
    const id = 'tx_' + crypto.randomBytes(8).toString('hex');
    const tx: Transaction = {
      ...data,
      id,
      userId,
      createdAt: new Date().toISOString(),
    };

    this.data.transactions[id] = tx;

    // Verificar e conceder XP por movimentação (limite 3 vezes ao dia)
    const today = new Date().toISOString().split('T')[0];
    const todayTxs = Object.values(this.data.transactions).filter(
      (t) => t.userId === userId && t.date === today
    );
    if (todayTxs.length <= 3) {
      this.awardXP(userId, 20, 'Movimentação registrada');
    }

    // Desafio 1 e 2
    const totalUserTxs = Object.values(this.data.transactions).filter((t) => t.userId === userId).length;
    if (totalUserTxs >= 1) {
      this.completeChallenge(userId, 'c1');
    }
    if (totalUserTxs >= 5) {
      this.completeChallenge(userId, 'c2');
    }

    this.persist();
    return tx;
  }

  public updateTransaction(
    userId: string,
    id: string,
    data: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>
  ): Transaction | null {
    const tx = this.data.transactions[id];
    if (!tx || tx.userId !== userId) return null;

    Object.assign(tx, data);
    this.persist();
    return tx;
  }

  public deleteTransaction(userId: string, id: string): boolean {
    const tx = this.data.transactions[id];
    if (!tx || tx.userId !== userId) return false;

    delete this.data.transactions[id];
    this.persist();
    return true;
  }

  // --- Goals ---
  public getGoals(userId: string): Goal[] {
    return Object.values(this.data.goals)
      .filter((g) => g.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createGoal(
    userId: string,
    data: Omit<Goal, 'id' | 'userId' | 'currentAmount' | 'status' | 'createdAt' | 'updatedAt'>
  ): Goal {
    const id = 'goal_' + crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();
    const goal: Goal = {
      ...data,
      id,
      userId,
      currentAmount: 0,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    this.data.goals[id] = goal;
    this.awardXP(userId, 40, 'Nova meta criada');
    this.completeChallenge(userId, 'c3');

    this.persist();
    return goal;
  }

  public updateGoal(
    userId: string,
    id: string,
    data: Partial<Omit<Goal, 'id' | 'userId' | 'createdAt'>>
  ): Goal | null {
    const goal = this.data.goals[id];
    if (!goal || goal.userId !== userId) return null;

    Object.assign(goal, data, { updatedAt: new Date().toISOString() });
    this.persist();
    return goal;
  }

  public depositGoal(userId: string, id: string, amount: number): Goal | null {
    const goal = this.data.goals[id];
    if (!goal || goal.userId !== userId) return null;

    goal.currentAmount = Math.max(0, (goal.currentAmount || 0) + amount);
    goal.updatedAt = new Date().toISOString();

    this.awardXP(userId, 30, 'Aporte em meta');
    this.completeChallenge(userId, 'c4');

    if (goal.currentAmount >= goal.targetAmount && goal.status !== 'completed') {
      goal.status = 'completed';
      this.awardXP(userId, 150, 'Meta financeira conquistada!');
    }

    this.persist();
    return goal;
  }

  public deleteGoal(userId: string, id: string): boolean {
    const goal = this.data.goals[id];
    if (!goal || goal.userId !== userId) return false;

    delete this.data.goals[id];
    this.persist();
    return true;
  }

  // --- Challenges ---
  public getChallenges(userId?: string): Challenge[] {
    const challenges = this.data.challenges;
    if (!userId) return challenges;

    const user = this.data.users[userId];
    const completedSet = new Set(user?.completedChallenges || []);

    return challenges.map((c) => ({
      ...c,
      completed: completedSet.has(c.id),
    }));
  }

  public completeChallenge(userId: string, challengeId: string): boolean {
    const user = this.data.users[userId];
    if (!user) return false;

    if (!user.completedChallenges) user.completedChallenges = [];
    if (user.completedChallenges.includes(challengeId)) return false;

    const challenge = this.data.challenges.find((c) => c.id === challengeId);
    if (!challenge) return false;

    user.completedChallenges.push(challengeId);
    this.awardXP(userId, challenge.xpReward, `Desafio concluído: ${challenge.title}`);
    this.persist();
    return true;
  }

  public setInvestorProfile(userId: string, profile: 'conservador' | 'moderado' | 'arrojado'): boolean {
    const user = this.data.users[userId];
    if (!user) return false;

    user.investorProfile = profile;
    this.completeChallenge(userId, 'c5');
    this.awardXP(userId, 50, 'Perfil de Investidor descoberto');
    this.persist();
    return true;
  }

  // --- Admin ---
  public getAdminStats(): AdminStats {
    const users = Object.values(this.data.users);
    const goals = Object.values(this.data.goals);
    const transactions = Object.values(this.data.transactions);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const activeUsers = users.filter((u) => u.lastActiveDate >= sevenDaysAgoStr).length;
    const completedGoals = goals.filter((g) => g.status === 'completed').length;
    const totalXP = users.reduce((sum, u) => sum + (u.xp || 0), 0);
    const totalChallengesFinished = users.reduce(
      (sum, u) => sum + (u.completedChallenges?.length || 0),
      0
    );

    const uptimeHours = Math.round((Date.now() - this.startTime) / (1000 * 60 * 60) * 10) / 10;

    return {
      totalUsers: users.length,
      totalTransactions: transactions.length,
      totalGoals: goals.length,
      totalCompletedGoals: completedGoals,
      totalXP,
      totalChallengesFinished,
      activeUsersLast7Days: activeUsers,
      serverUptimeHours: uptimeHours,
    };
  }

  public getAdminSettings() {
    return this.data.adminSettings;
  }

  public updateAdminSettings(settings: Partial<DatabaseSchema['adminSettings']>) {
    Object.assign(this.data.adminSettings, settings);
    this.persist();
    return this.data.adminSettings;
  }
}

export const db = new Database();
