import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, InternalUser } from './db.ts';

export const apiRouter = Router();

// Middleware to extract user from Authorization header Bearer token or cookie
export interface AuthenticatedRequest extends Request {
  user?: InternalUser;
  userId?: string;
}

const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.cookies?.session_token || req.headers['x-session-token']);

  if (!token || typeof token !== 'string') {
    res.status(401).json({ error: 'Não autorizado. Faça login para continuar.' });
    return;
  }

  const session = db.getSession(token);
  if (!session) {
    res.status(401).json({ error: 'Sessão expirada ou inválida.' });
    return;
  }

  const user = db.getUserById(session.userId);
  if (!user) {
    res.status(401).json({ error: 'Usuário não encontrado.' });
    return;
  }

  req.user = user;
  req.userId = user.id;
  next();
};

// Admin authentication middleware
const adminTokens = new Set<string>();

const adminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers['x-admin-token'] as string;
  if (!token || !adminTokens.has(token)) {
    res.status(403).json({ error: 'Acesso restrito a administradores autenticados.' });
    return;
  }
  next();
};

function formatUserResponse(user: InternalUser) {
  const levelInfo = db.getLevelInfo(user.xp);
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    theme: user.theme,
    accentColor: user.accentColor,
    xp: user.xp,
    level: levelInfo.level,
    levelTitle: levelInfo.title,
    minXp: levelInfo.minXp,
    nextLevelXp: levelInfo.nextLevelXp,
    streak: user.streak,
    lastActiveDate: user.lastActiveDate,
    investorProfile: user.investorProfile,
    completedChallenges: user.completedChallenges || [],
    unlockedBadges: user.unlockedBadges || [],
    createdAt: user.createdAt,
  };
}

// -------------------------------------------------------------
// AUTH ROUTES
// -------------------------------------------------------------

apiRouter.post('/auth/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, confirmPassword, displayName } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      res.status(400).json({ error: 'Nome de usuário deve ter pelo menos 3 caracteres.' });
      return;
    }

    // Sanitização de username (apenas letras, números, sublinhado e hífen)
    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(cleanUsername)) {
      res.status(400).json({ error: 'O nome de usuário só pode conter letras, números, "-" e "_".' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ error: 'A confirmação de senha não confere.' });
      return;
    }

    // Impedir nomes de usuário duplicados
    const existing = db.getUserByUsername(cleanUsername);
    if (existing) {
      res.status(409).json({ error: 'Este nome de usuário já está em uso. Escolha outro.' });
      return;
    }

    // Hash seguro com salt via bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = db.createUser(cleanUsername, passwordHash, displayName);
    const token = db.createSession(newUser.id);

    res.status(201).json({
      message: 'Conta criada com sucesso!',
      token,
      user: formatUserResponse(newUser),
    });
  } catch (err) {
    console.error('Erro no registro:', err);
    res.status(500).json({ error: 'Erro interno ao criar conta.' });
  }
});

apiRouter.post('/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Informe nome de usuário e senha.' });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const user = db.getUserByUsername(cleanUsername);

    if (!user) {
      res.status(401).json({ error: 'Nome de usuário ou senha incorretos.' });
      return;
    }

    // Verificar bloqueio por tentativas
    if (user.lockedUntil && Date.now() < user.lockedUntil) {
      const waitMinutes = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      res.status(429).json({
        error: `Muitas tentativas incorretas. Conta bloqueada temporariamente. Tente em ${waitMinutes} minutos.`,
      });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    db.recordLoginAttempt(user, passwordMatches);

    if (!passwordMatches) {
      res.status(401).json({ error: 'Nome de usuário ou senha incorretos.' });
      return;
    }

    const token = db.createSession(user.id);

    res.json({
      message: 'Login realizado com sucesso!',
      token,
      user: formatUserResponse(user),
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno no servidor ao fazer login.' });
  }
});

apiRouter.post('/auth/logout', (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-session-token'] as string);

  if (token) {
    db.deleteSession(token);
  }
  res.json({ message: 'Sessão encerrada com sucesso.' });
});

apiRouter.get('/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Usuário não autenticado.' });
    return;
  }
  db.updateStreakAndActivity(req.user.id);
  res.json({ user: formatUserResponse(req.user) });
});

apiRouter.put('/auth/profile', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  if (!req.userId) {
    res.status(401).json({ error: 'Não autorizado.' });
    return;
  }

  const { displayName, avatar, theme, accentColor } = req.body;
  const updated = db.updateUserProfile(req.userId, { displayName, avatar, theme, accentColor });

  if (!updated) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }

  res.json({
    message: 'Perfil atualizado!',
    user: formatUserResponse(updated),
  });
});

apiRouter.delete('/auth/delete-account', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  if (!req.userId) {
    res.status(401).json({ error: 'Não autorizado.' });
    return;
  }

  const ok = db.deleteUserAccount(req.userId);
  if (!ok) {
    res.status(500).json({ error: 'Falha ao excluir conta.' });
    return;
  }

  res.json({ message: 'Conta e todos os dados foram permanentemente removidos conforme a LGPD.' });
});

// -------------------------------------------------------------
// TRANSACTIONS ROUTES
// -------------------------------------------------------------

apiRouter.get('/transactions', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const list = db.getTransactions(req.userId!);
  res.json(list);
});

apiRouter.post('/transactions', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { description, amount, type, category, date, notes } = req.body;

  if (!description || typeof description !== 'string' || !description.trim()) {
    res.status(400).json({ error: 'Descrição da movimentação é obrigatória.' });
    return;
  }

  const parsedAmount = Math.abs(parseFloat(amount));
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    res.status(400).json({ error: 'Valor deve ser um número maior que zero.' });
    return;
  }

  if (type !== 'income' && type !== 'expense') {
    res.status(400).json({ error: 'Tipo deve ser "income" (entrada) ou "expense" (saída).' });
    return;
  }

  const validDate = date || new Date().toISOString().split('T')[0];

  const tx = db.createTransaction(req.userId!, {
    description: description.trim(),
    amount: parsedAmount,
    type,
    category: category || 'outros',
    date: validDate,
    notes: notes?.trim() || '',
  });

  const updatedUser = db.getUserById(req.userId!);
  res.status(201).json({
    transaction: tx,
    user: updatedUser ? formatUserResponse(updatedUser) : undefined,
  });
});

apiRouter.put('/transactions/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const { description, amount, type, category, date, notes } = req.body;

  const dataToUpdate: any = {};
  if (description !== undefined) dataToUpdate.description = description.trim();
  if (amount !== undefined) dataToUpdate.amount = Math.abs(parseFloat(amount));
  if (type !== undefined) dataToUpdate.type = type;
  if (category !== undefined) dataToUpdate.category = category;
  if (date !== undefined) dataToUpdate.date = date;
  if (notes !== undefined) dataToUpdate.notes = notes.trim();

  const tx = db.updateTransaction(req.userId!, id, dataToUpdate);
  if (!tx) {
    res.status(404).json({ error: 'Movimentação não encontrada.' });
    return;
  }

  res.json(tx);
});

apiRouter.delete('/transactions/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const ok = db.deleteTransaction(req.userId!, id);
  if (!ok) {
    res.status(404).json({ error: 'Movimentação não encontrada.' });
    return;
  }
  res.json({ message: 'Movimentação excluída com sucesso.' });
});

// -------------------------------------------------------------
// GOALS ROUTES
// -------------------------------------------------------------

apiRouter.get('/goals', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const list = db.getGoals(req.userId!);
  res.json(list);
});

apiRouter.post('/goals', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { name, targetAmount, deadline, category, notes } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Nome da meta é obrigatório.' });
    return;
  }

  const parsedTarget = Math.abs(parseFloat(targetAmount));
  if (isNaN(parsedTarget) || parsedTarget <= 0) {
    res.status(400).json({ error: 'Valor da meta deve ser maior que zero.' });
    return;
  }

  const goal = db.createGoal(req.userId!, {
    name: name.trim(),
    targetAmount: parsedTarget,
    deadline: deadline || undefined,
    category: category || 'Geral',
    notes: notes?.trim() || '',
  });

  const updatedUser = db.getUserById(req.userId!);
  res.status(201).json({
    goal,
    user: updatedUser ? formatUserResponse(updatedUser) : undefined,
  });
});

apiRouter.put('/goals/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const { name, targetAmount, deadline, category, status, notes } = req.body;

  const dataToUpdate: any = {};
  if (name !== undefined) dataToUpdate.name = name.trim();
  if (targetAmount !== undefined) dataToUpdate.targetAmount = Math.abs(parseFloat(targetAmount));
  if (deadline !== undefined) dataToUpdate.deadline = deadline;
  if (category !== undefined) dataToUpdate.category = category;
  if (status !== undefined) dataToUpdate.status = status;
  if (notes !== undefined) dataToUpdate.notes = notes.trim();

  const goal = db.updateGoal(req.userId!, id, dataToUpdate);
  if (!goal) {
    res.status(404).json({ error: 'Meta não encontrada.' });
    return;
  }

  res.json(goal);
});

apiRouter.post('/goals/:id/deposit', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const { amount } = req.body;

  const parsed = Math.abs(parseFloat(amount));
  if (isNaN(parsed) || parsed <= 0) {
    res.status(400).json({ error: 'Valor do aporte deve ser positivo.' });
    return;
  }

  const goal = db.depositGoal(req.userId!, id, parsed);
  if (!goal) {
    res.status(404).json({ error: 'Meta não encontrada.' });
    return;
  }

  const updatedUser = db.getUserById(req.userId!);
  res.json({
    goal,
    user: updatedUser ? formatUserResponse(updatedUser) : undefined,
  });
});

apiRouter.delete('/goals/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const ok = db.deleteGoal(req.userId!, id);
  if (!ok) {
    res.status(404).json({ error: 'Meta não encontrada.' });
    return;
  }
  res.json({ message: 'Meta excluída com sucesso.' });
});

// -------------------------------------------------------------
// CHALLENGES & GAMIFICATION ROUTES
// -------------------------------------------------------------

apiRouter.get('/challenges', (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-session-token'] as string);

  let userId: string | undefined = undefined;
  if (token) {
    const session = db.getSession(token);
    if (session) userId = session.userId;
  }

  const list = db.getChallenges(userId);
  res.json(list);
});

apiRouter.post('/challenges/:id/claim', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const ok = db.completeChallenge(req.userId!, id);

  if (!ok) {
    res.status(400).json({ error: 'Desafio já resgatado ou não encontrado.' });
    return;
  }

  const updatedUser = db.getUserById(req.userId!);
  res.json({
    message: 'Recompensa de XP resgatada!',
    user: updatedUser ? formatUserResponse(updatedUser) : undefined,
  });
});

apiRouter.post('/investments/quiz', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { profile } = req.body;
  if (profile !== 'conservador' && profile !== 'moderado' && profile !== 'arrojado') {
    res.status(400).json({ error: 'Perfil inválido.' });
    return;
  }

  db.setInvestorProfile(req.userId!, profile);
  const updatedUser = db.getUserById(req.userId!);

  res.json({
    message: 'Perfil de investidor salvo com sucesso!',
    user: updatedUser ? formatUserResponse(updatedUser) : undefined,
  });
});

// -------------------------------------------------------------
// ADMIN ROUTES (Protected by ADMIN_PASSWORD)
// -------------------------------------------------------------

apiRouter.post('/admin/verify', (req: Request, res: Response): void => {
  const { password } = req.body;
  const configuredPassword = process.env.ADMIN_PASSWORD || '31181022';

  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'Senha de administrador é obrigatória.' });
    return;
  }

  // Safe time-constant comparison simulation
  const isMatch = password.trim() === configuredPassword.trim();

  if (!isMatch) {
    res.status(401).json({ error: 'Senha administrativa incorreta.' });
    return;
  }

  const adminToken = 'adm_' + crypto.randomBytes(24).toString('hex');
  adminTokens.add(adminToken);

  // Expira após 2 horas
  setTimeout(() => adminTokens.delete(adminToken), 2 * 60 * 60 * 1000);

  res.json({
    message: 'Acesso administrativo autorizado!',
    adminToken,
  });
});

apiRouter.get('/admin/stats', adminMiddleware, (req: Request, res: Response): void => {
  const stats = db.getAdminStats();
  const settings = db.getAdminSettings();
  res.json({ stats, settings });
});

apiRouter.post('/admin/settings', adminMiddleware, (req: Request, res: Response): void => {
  const { announcements, xpMultiplier, maintenanceMode } = req.body;
  const updated = db.updateAdminSettings({
    ...(announcements ? { announcements } : {}),
    ...(typeof xpMultiplier === 'number' ? { xpMultiplier } : {}),
    ...(typeof maintenanceMode === 'boolean' ? { maintenanceMode } : {}),
  });

  res.json({ message: 'Configurações atualizadas com sucesso.', settings: updated });
});

// Health check
apiRouter.get('/health', (req: Request, res: Response): void => {
  res.json({ status: 'ok', service: 'GranaXP API', time: new Date().toISOString() });
});
