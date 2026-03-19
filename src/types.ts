export interface ProductItem {
  id: string;
  title: string;
  category: string;
  description: string;
  author: string;
  url?: string;
  tags?: string[];
  date?: string;
  thumbnail?: string;
  publisher?: { name: string; url?: string; logo?: string };
  advertisers?: { name: string; url?: string; logo?: string }[];
  htmlFile?: string;
  bgColor?: string;
  hasAds?: boolean;
}

export type Category =
  | 'All'
  | 'SaaS'
  | 'Mobile Apps'
  | 'Marketplaces'
  | 'AI Products';
