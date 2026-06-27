module.exports = {
  apps: [
    {
      name: 'checkerlinkbot-backend',
      script: './server.js',
      cwd: __dirname,
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
