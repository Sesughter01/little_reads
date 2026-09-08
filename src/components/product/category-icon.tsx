import { BookOpen, Sprout, Leaf, TreePine, Palette, Heart, Moon, Compass, FlaskConical, GraduationCap, Globe2, Users } from 'lucide-react';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  adventure: Compass,
  science: FlaskConical,
  education: GraduationCap,
  'african-stories': Globe2,
  'life-skills': Heart,
  nature: TreePine,
  friendship: Users,
  'bedtime-stories': Moon,
  bedtime: Moon,
  art: Palette,
};

export function CategoryIcon({
  slug,
  className = 'h-6 w-6',
}: {
  slug: string;
  className?: string;
}) {
  const Icon = ICONS[slug] ?? BookOpen;
  return <Icon className={className} />;
}
