FROM nginx

RUN rm /etc/nginx/conf.d/default.conf

COPY /etc/letsencrypt/live/webrtc-chat-app-demo.site /etc/letsencrypt/live/webrtc-chat-app-demo.site/
COPY nginx.conf /etc/nginx/conf.d/default.conf