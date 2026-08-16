
export class Router {
  /**
   * @param {Array<{ path: string|RegExp, handler: Function }>} routes
   */
  constructor(routes) {
    this.routes = routes;
    window.addEventListener('popstate', () => this._dispatch());
  }

  navigate(path, pushState = true) {
    if (pushState) {
      window.history.pushState(null, '', path);
    }
    this._dispatch();
  }

  _dispatch() {
    const path = window.location.pathname || '/';
    for (const route of this.routes) {
      const match =
        route.path instanceof RegExp
          ? path.match(route.path)
          : path === route.path
          ? [path]
          : null;
      if (match) {
        route.handler(match);
        return;
      }
    }
  
    this.routes[0]?.handler(['/']);
  }

  start() {
    this._dispatch();
  }
}
