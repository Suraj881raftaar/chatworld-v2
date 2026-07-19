// TypeScript types for bindings and context variables inside Hono

export type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  CHAT_ROOM: DurableObjectNamespace;
  ASSETS: Fetcher;
  ENVIRONMENT: string;
};

export type Variables = {
  user: {
    id: string;
    username: string;
    role: string;
  };
};
