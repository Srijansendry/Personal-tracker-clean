import { useListBadges, useGetUserStats } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { Award, Lock, Star, Flame, Crown, Zap, Shield, Target, CheckCircle } from "lucide-react";
import { Badge as BadgeUI } from "@/components/ui/badge";

const getBadgeIcon = (iconName?: string) => {
  switch (iconName?.toLowerCase()) {
    case 'flame': return <Flame className="w-8 h-8 text-orange-500" />;
    case 'crown': return <Crown className="w-8 h-8 text-yellow-500" />;
    case 'zap': return <Zap className="w-8 h-8 text-yellow-400" />;
    case 'shield': return <Shield className="w-8 h-8 text-indigo-500" />;
    case 'target': return <Target className="w-8 h-8 text-red-500" />;
    case 'checkcircle': return <CheckCircle className="w-8 h-8 text-green-500" />;
    case 'star': return <Star className="w-8 h-8 text-amber-400" />;
    case 'award':
    default: return <Award className="w-8 h-8 text-primary" />;
  }
};

export default function Badges() {
  const { data: badges = [], isLoading: badgesLoading } = useListBadges();
  const { data: stats, isLoading: statsLoading } = useGetUserStats();

  const getRarityColor = (rarity?: string) => {
    switch (rarity) {
      case 'legendary': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'epic': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'rare': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'common':
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Badges & Achievements</h1>
        <p className="text-muted-foreground">Your trophy case of productivity.</p>
      </div>

      {/* Progress Header */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          {statsLoading ? (
            <p>Loading stats...</p>
          ) : stats ? (
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Star className="w-12 h-12 text-primary" />
              </div>
              <div className="flex-1 w-full">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h2 className="text-2xl font-bold">Level {stats.level}</h2>
                    <p className="text-sm text-muted-foreground">Keep completing tasks to level up!</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-lg">{100 - stats.xpToNextLevel}</span>
                    <span className="text-muted-foreground text-sm"> / 100 XP</span>
                  </div>
                </div>
                <Progress value={100 - stats.xpToNextLevel} className="h-4" />
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="bg-card rounded-lg p-3 border text-center">
                    <div className="text-2xl font-bold text-accent">{stats.totalTasksCompleted}</div>
                    <div className="text-xs text-muted-foreground">Tasks Done</div>
                  </div>
                  <div className="bg-card rounded-lg p-3 border text-center">
                    <div className="text-2xl font-bold text-orange-500">{stats.dailyStreak}</div>
                    <div className="text-xs text-muted-foreground">Day Streak</div>
                  </div>
                  <div className="bg-card rounded-lg p-3 border text-center">
                    <div className="text-2xl font-bold text-purple-500">{stats.badges}</div>
                    <div className="text-xs text-muted-foreground">Badges Earned</div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Badges Grid */}
      <div>
        <h3 className="text-xl font-bold mb-4">Earned Badges</h3>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {badgesLoading ? (
            <p>Loading badges...</p>
          ) : badges.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
              Complete tasks and maintain streaks to earn badges!
            </div>
          ) : (
            badges.map((badge, idx) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.05, rotateY: 10 }}
                style={{ perspective: 1000 }}
              >
                <Card className={`h-full border-2 ${getRarityColor(badge.rarity)}`}>
                  <CardContent className="p-6 text-center flex flex-col items-center justify-center min-h-[200px]">
                    <div className="w-16 h-16 mb-4 flex items-center justify-center bg-white/50 rounded-full shadow-sm">
                      {getBadgeIcon(badge.icon)} 
                    </div>
                    <h4 className="font-bold text-lg mb-1">{badge.name}</h4>
                    <p className="text-xs opacity-80 mb-3">{badge.description}</p>
                    <BadgeUI variant="outline" className="mt-auto bg-white/50">{badge.rarity || 'common'}</BadgeUI>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
