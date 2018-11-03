sudo apt install -y autoconf automake libtool
sudo apt install -y gstreamer1.0-tools gstreamer1.0-plugins-good gstreamer1.0-plugins-ugly libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev
curl -L -o ./.skyway/gst-rpicamsrc --create-dirs https://github.com/thaytan/gst-rpicamsrc/archive/master.zip
unzip gst-rpicamsrc-master
cd gst-rpicamsrc-master
./autogen.sh --prefix=/usr --libdir=/usr/lib/arm-linux-gnueabihf/
make
sudo make install