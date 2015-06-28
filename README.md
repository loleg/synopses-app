# Synopses app

Based on Polymer framework.

#### Building

Install [Vulcanize](https://github.com/polymer/vulcanize) (`npm install -g vulcanize`) and run:

  vulcanize elements.html > vulcanized.html

This will create vulcanized.html, which is used in index.html.

You can also npm install `gulp` and `browser-sync` for live-reload development using:

    gulp server

After the project is restructured (into app/components) we can use `gulp-vulcanize` as build tool.

#### Deploying

You will need to proxy /api to the **synopses-base** project /api - e.g. using nginx:

```
location /api/ {
    proxy_pass http://localhost:5000/api/;
}
```

#### Testing

Hitting http://localhost:8080?debug will bypass sign-in.
