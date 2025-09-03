export interface SlashCommand {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'headings' | 'lists' | 'blocks' | 'media';
  action: string;
  keywords?: string[];
  shortcut?: string;
}

export interface SlashPluginState {
  active: boolean;
  range: {
    from: number;
    to: number;
  };
  query: string;
  suggestions: SlashCommand[];
  index: number;
}
