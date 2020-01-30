module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        useBuiltIns: "usage",
        forceAllTransforms: true,
        ignoreBrowserslistConfig: false,
        modules: false,
        debug: true
      }
    ]
  ]
};
