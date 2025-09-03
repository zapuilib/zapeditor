export interface SlashCommand {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'text' | 'media' | 'layout' | 'advanced';
  action: string;
  keywords?: string[];
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
