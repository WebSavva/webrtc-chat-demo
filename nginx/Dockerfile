FROM nginx

RUN rm /etc/nginx/conf.d/default.conf

COPY ./certificate /etc/letsencrypt/live/webrtc-chat-app-demo.site/
COPY nginx.conf /etc/nginx/conf.d/default.conf