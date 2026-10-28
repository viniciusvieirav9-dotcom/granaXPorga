export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

export function getLevelData(xp: number) {
  if (xp < 200) {
    return {
      level: 1,
      title: 'Iniciante',
      minXp: 0,
      nextLevelXp: 200,
      progressPercent: Math.min(100, Math.round((xp / 200) * 100)),
      color: '#34d399',
      badge: '🌱',
      description: 'Dando os primeiros passos no controle financeiro.',
    };
  } else if (xp < 500) {
    return {
      level: 2,
      title: 'Explorador',
      minXp: 200,
      nextLevelXp: 500,
      progressPercent: Math.min(100, Math.round(((xp - 200) / (500 - 200)) * 100)),
      color: '#38bdf8',
      badge: '🧭',
      description: 'Mapeando entradas e saídas sem deixar nada passar.',
    };
  } else if (xp < 1000) {
    return {
      level: 3,
      title: 'Estrategista',
      minXp: 500,
      nextLevelXp: 1000,
      progressPercent: Math.min(100, Math.round(((xp - 500) / (1000 - 500)) * 100)),
      color: '#a855f7',
      badge: '⚔️',
      description: 'Definindo metas ambiciosas e eliminando gastos inúteis.',
    };
  } else if (xp < 2000) {
    return {
      level: 4,
      title: 'Planejador',
      minXp: 1000,
      nextLevelXp: 2000,
      progressPercent: Math.min(100, Math.round(((xp - 1000) / (2000 - 1000)) * 100)),
      color: '#f59e0b',
      badge: '🛡️',
      description: 'Construindo reservas sólidas e prevendo o futuro.',
    };
  } else {
    return {
      level: 5,
      title: 'Mestre da Grana',
      minXp: 2000,
      nextLevelXp: 5000,
      progressPercent: Math.min(100, Math.round(((xp - 2000) / 3000) * 100)),
      color: '#10b981',
      badge: '👑',
      description: 'Domínio absoluto do próprio dinheiro e investimentos.',
    };
  }
}

export const AVATAR_OPTIONS = [
  { id: 'gamer', label: 'Gamer', emoji: '🎮', color: 'from-emerald-500 to-teal-700' },
  { id: 'ninja', label: 'Ninja', emoji: '🥷', color: 'from-zinc-700 to-zinc-900' },
  { id: 'astronaut', label: 'Cosmo', emoji: '👨‍🚀', color: 'from-sky-500 to-blue-700' },
  { id: 'wizard', label: 'Mago', emoji: '🧙‍♂️', color: 'from-purple-500 to-indigo-800' },
  { id: 'cyborg', label: 'Cyborg', emoji: '🤖', color: 'from-cyan-500 to-blue-600' },
  { id: 'fox', label: 'Raposa', emoji: '🦊', color: 'from-amber-500 to-orange-700' },
];

export const CATEGORY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  alimentacao: { label: 'Alimentação', icon: 'Utensils', color: 'text-amber-400 bg-amber-400/10' },
  transporte: { label: 'Transporte', icon: 'Car', color: 'text-blue-400 bg-blue-400/10' },
  estudos: { label: 'Estudos & Cursos', icon: 'GraduationCap', color: 'text-purple-400 bg-purple-400/10' },
  lazer: { label: 'Lazer & Games', icon: 'Gamepad2', color: 'text-pink-400 bg-pink-400/10' },
  compras: { label: 'Compras', icon: 'ShoppingBag', color: 'text-rose-400 bg-rose-400/10' },
  contas: { label: 'Contas & Boletos', icon: 'FileText', color: 'text-orange-400 bg-orange-400/10' },
  salario: { label: 'Salário / Mesada', icon: 'Banknote', color: 'text-emerald-400 bg-emerald-400/10' },
  investimento: { label: 'Investimento / Reserva', icon: 'TrendingUp', color: 'text-teal-400 bg-teal-400/10' },
  outros: { label: 'Outros', icon: 'MoreHorizontal', color: 'text-neutral-400 bg-neutral-400/10' },
};
