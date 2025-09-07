export interface MentionOption {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
}

export interface MentionPluginState {
  active: boolean;
  range: {
    from: number;
    to: number;
  };
  query: string;
  suggestions: MentionOption[];
  index: number;
}
