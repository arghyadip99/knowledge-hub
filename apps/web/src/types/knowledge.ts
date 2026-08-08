export type Ship = {
  _id: string;
  name: string;
  color: string;
  description?: string;
  imageUrl?: string;
  cardCount: number;
};

export type SourceProgress = {
  stage?: string;
  completed?: number;
  total?: number;
  candidates?: number;
  ideas?: number;
  message?: string;
};

export type Source = {
  _id: string;
  title: string;
  creatorName: string;
  type: string;
  url?: string;
  thumbnailUrl?: string;
  rawText: string;
  status: string;
  transcriptStatus: string;
  focusArea?: string;
  failureReason?: string;
  ingestionMetadata?: { progress?: SourceProgress };
  createdAt?: string;
  updatedAt?: string;
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
  knowledgeEntryId?: string;
  text: string;
  status: "open" | "completed" | "dismissed";
  reminderFrequency: string;
  dueAt?: string;
  completedAt?: string;
  entryTitle?: string;
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

export type SourceDraftEntry = {
  _id: string;
  title: string;
  captainName?: string;
  centralThesis: string;
  summary: string;
  whyItMattersToMe?: string;
  tags: string[];
  status: string;
  confidence?: number;
};

export type SourceRun = {
  _id: string;
  provider: string;
  model?: string;
  status: string;
  error?: string;
  createdAt: string;
  rawOutput?: { usedFallback?: boolean; candidates?: number };
};

export type SourceDetail = {
  source: Source;
  entry: SourceDraftEntry | null;
  chunks: { _id: string }[];
  ideas: Idea[];
  quotes: { _id: string; text: string; speaker?: string; approved: boolean }[];
  actions: Action[];
  runs: SourceRun[];
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
