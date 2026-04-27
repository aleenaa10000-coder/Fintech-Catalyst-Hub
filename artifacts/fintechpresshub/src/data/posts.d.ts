declare const posts: Array<{
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  image: string;
  date: string;
  readTime: string;
  author: string;
  authorRole?: string;
  authorAvatar?: string;
  featured?: boolean;
  tags?: string[];
  content: string;
}>;

export default posts;
