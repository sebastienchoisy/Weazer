class dataSource {

    constructor(name, ident, type) {
        this.name = name;
        this.ident = ident;
        this.type = type;
        this.city = '';
        this.country = '';
        this.lastLongitude = '';
        this.lastLatitude = '';
        this.lastTemp = '';
        this.marker = undefined;
        this.data = [];
        this.pred = [];
    }

    getName() {
        return this.name;
    }

    getIdent() {
        return this.ident;
    }

    getType() {
        return this.type;
    }

    getLastTemp() {
        return this.lastTemp;
    }

    getMarker() {
        return this.marker;
    }

    getCity() {
        return this.city;
    }

    getCountry() {
        return this.country;
    }

    getData() {
        return this.data;
    }

    setData(data) {
        this.data = data;
    }

    setLong(longitude) {
        this.lastLongitude = longitude;
    }

    setLat(latitude) {
        this.lastLatitude = latitude;
    }

    setCountry(country) {
        this.country = country;
    }

    setCity(city) {
        this.city = city;
    }

    setPred(pred) {
        this.pred = pred;
    }

    getPred() {
        return this.pred;
    }

    haslocalisation() {
        return !!(this.lastLongitude && this.lastLatitude);
    }

    setUpMarker() { // On crée et on place le marker
        L.Marker.prototype.options.icon = L.icon({
            iconUrl: "./assets/icon-marker.png",
            iconSize: [35, 35],
            popupAnchor: [0, -15]
        });
        this.marker = L.marker([this.lastLatitude, this.lastLongitude]).addTo(tempMap);
        this.marker.bindPopup("<span>" + this.name + "</span><br><span>" + this.lastTemp +
            " °C   <img src='./assets/" + (this.lastTemp > 18 ? "hot" : "cold") + ".png' width='15' height='15'></span>");
        this.marker.on("mouseover", () => this.marker.openPopup());
        this.marker.on("mouseout", () => this.marker.closePopup());
        this.marker.on("click", () => {
            infoContainer.setDataSource(this);
            infoContainer.setInfo();
            infoContainer.setPredict();
            document.getElementById("marker_info").classList.remove("hidden");
        })
    }

    extractLastData() { // On récupère les dernières données
        let lastData = this.data[this.data.length - 1];
        if (lastData) {
            this.lastTemp = lastData.value;
            if (this.type == "esp") {
                this.lastLatitude = lastData.localisation.latitude;
                this.lastLongitude = lastData.localisation.longitude;
            }
        }
        this.refreshDataMarker();
    }

    refreshDataMarker() { // On met à jour les informations présentes dans la pop-up du marker
        if (this.marker) {
            this.marker.setLatLng(L.latLng(this.lastLatitude, this.lastLongitude));
            this.marker.setPopupContent("<span>" + this.name + "</span><br><span>" + this.lastTemp +
                " °C   <img src='./assets/" + (this.lastTemp > 18 ? "hot" : "cold") + ".png' width='15' height='15'></span>");
        }
    }

    getLocationName() { // On récupère la ville et le pays avec la longitude et la latitude
        let apikey = 'caba220665794103af12e0a53e775bb8';
        $.ajax({
            url: "https://api.bigdatacloud.net/data/reverse-geocode?latitude=" + this.lastLatitude + "&longitude=" + this.lastLongitude + "&localityLanguage=fr&key=" + apikey,
            type: 'GET',
            headers: {Accept: "application/json",},
            success: function (resultat, statut) {
            },
            error: function (resultat, statut, erreur) {
            },
            complete: function (resultat, statut) {
            }
        }).done((res) => {
            this.city = res.city || res.locality;
            this.country = res.countryCode
        });
    }
}