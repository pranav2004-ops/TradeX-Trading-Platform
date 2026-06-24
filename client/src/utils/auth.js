const hasAuthToken = () => Boolean(localStorage.getItem("token"));

export { hasAuthToken };
