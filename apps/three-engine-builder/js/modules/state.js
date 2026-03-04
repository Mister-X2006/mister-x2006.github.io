export const createProjectState = () => ({
  meta: {
    name: "Untitled Three Blueprint Project",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  entities: [],
  paused: false,
});

export const touchProject = (state) => {
  state.meta.updatedAt = new Date().toISOString();
};
