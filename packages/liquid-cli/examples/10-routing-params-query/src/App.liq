--- logic
import { signal } from 'liquid';

// Route state simulation
const currentPath = signal('/users/42?tab=activity');

function navigate(to) {
  currentPath.set(to);
}

// Extracted params and query parsing
function getRouteInfo() {
  const [path, queryStr] = currentPath().split('?');
  const userMatch = path.match(/^\/users\/(\w+)/);
  const userId = userMatch ? userMatch[1] : null;

  const queryParams = {};
  if (queryStr) {
    queryStr.split('&').forEach(pair => {
      const [k, v] = pair.split('=');
      queryParams[k] = v;
    });
  }

  return { path, userId, tab: queryParams.tab || 'overview' };
}

--- style
.container {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: #f8fafc;
}
.header {
  background-color: #0f172a;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 14px;
}
.title {
  font-size: 18px;
  font-weight: 700;
  color: #f8fafc;
}
.nav-row {
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin-bottom: 14px;
}
.nav-link {
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  background-color: #f1f5f9;
  color: #475569;
}
.nav-link-active {
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  background-color: #0284c7;
  color: #ffffff;
}
.card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  padding: 18px;
  border-radius: 10px;
  border-width: 1px;
  border-color: #e2e8f0;
}
.card-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
}
.info-box {
  background-color: #e0f2fe;
  padding: 12px;
  border-radius: 8px;
  margin-top: 8px;
  gap: 4px;
}
.info-line {
  font-size: 13px;
  color: #0369a1;
  font-weight: 600;
}

--- ui
div.container
  header.header
    span.title 🫟 10 — Routing, Params & Queries

  div.nav-row
    button class="{currentPath().startsWith('/users/42') ? 'nav-link-active' : 'nav-link'}" @click=navigate('/users/42?tab=activity') User #42
    button class="{currentPath().startsWith('/users/99') ? 'nav-link-active' : 'nav-link'}" @click=navigate('/users/99?tab=settings') User #99
    button class="{currentPath() === '/explore' ? 'nav-link-active' : 'nav-link'}" @click=navigate('/explore') Explore
    button class="{currentPath() === '/unknown' ? 'nav-link-active' : 'nav-link'}" @click=navigate('/unknown') 404 Route

  div.card
    if getRouteInfo().userId
      span.card-title User Profile Route
      div.info-box
        span.info-line Matched User ID: {getRouteInfo().userId}
        span.info-line Active Query Tab: {getRouteInfo().tab}
        span.info-line Full URL: {currentPath()}
    else
      if currentPath() === '/explore'
        span.card-title Explore Hub
        div.info-box
          span.info-line Browse trending Liquid components and shared stores.
      else
        span.card-title 404 — Not Found
        div.info-box
          span.info-line No matching route found for: {currentPath()}
