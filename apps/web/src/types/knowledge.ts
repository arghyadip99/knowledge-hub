export type Ship = {
  _id: string;
  name: string;
  color: string;
  description?: string;
  cardCount: number;
};

export type Source = {
  _id: string;
  title: string;
  creatorName: string;
  type: string;
  url?: string;
  rawText: string;
  status: string;
  transcriptStatus: string;
  focusArea?: string;
};

export type Idea = {
  _id: string;
  title: string;
  explanation: string;
  approved: boolean;
  confidence?: number;
};

export type Action = {
  _id: string;
  text: string;
  status: string;
  reminderFrequency: string;
};

export type Entry = {
  _id: string;
  sourceId: string;
  title: string;
  captainName?: string;
  shipIds: string[];
  ships: Ship[];
  status: "inbox" | "distilled" | "applied" | "archived";
  centralThesis: string;
  summary: string;
  tags: string[];
  ideas: Idea[];
  actions: Action[];
  source?: Source;
  engagement: Engagement | null;
};

export type Engagement = {
  id: string;
  resonatedCount: number;
  commentCount: number;
  shareCount: number;
  viewerResonated: boolean;
  comments: {
    id: string;
    authorName: string;
    text: string;
    createdAt: string;
  }[];
};

export type Detail = {
  source: Source;
  entry: Entry | null;
  ideas: Idea[];
  quotes: { _id: string; text: string; speaker?: string; approved: boolean }[];
  actions: Action[];
  ships: Ship[];
};

export type Dashboard = {
  total: number;
  distilled: number;
  applied: number;
  inbox: number;
  due: number;
};

export const emptyDashboard: Dashboard = {
  total: 0,
  distilled: 0,
  applied: 0,
  inbox: 0,
  due: 0,
};

export type NotificationSummary = {
  unreadCount: number;
  notification: null | {
    id: string;
    count: number;
    latestEntryTitle: string;
    publishedAt?: string;
  };
};
