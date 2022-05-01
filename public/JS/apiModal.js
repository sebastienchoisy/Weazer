

class ApiModal {
    constructor(){
        this.modal = document.getElementById("modal");
        this.btn = document.getElementById("add_api_button");
        this.closeSpan = document.getElementsByClassName("close")[1];
        this.latitudeInput = document.getElementById("latitude");
        this.longitudeInput = document.getElementById("longitude");
        this.infoPanel = document.getElementsByClassName("info_message")[1];
        this.addBtn = document.getElementById("add_button");
        this.bkBtn = document.getElementsByClassName("back_button")[1];
        this.modalContent = document.getElementById("api-modal-content");
        this.initModal();
    }

    initModal() {
        this.btn.addEventListener("click", () => {
            this.modalContent.classList.remove("hidden");
            this.modal.style.display = "block";
        });
        this.closeSpan.addEventListener("click", () => {
            this.modalContent.classList.add("hidden");
            this.modal.style.display = "none";
            this.clearModal();
        });
        this.bkBtn.addEventListener("click", () => {
            this.modalContent.classList.add("hidden");
            this.modal.style.display = "none";
            this.clearModal();
        });
        this.addBtn.addEventListener("click", () => {
            if(this.areFormValuesEmpty()){
                this.highLightEmptiesInputs();
                this.infoPanel.innerText="Tous les champs sont obligatoires !"
            } else if(this.areFormValuesValid()) {
                this.addRequest();
            }
        });
    }

    clearModal(){
        this.latitudeInput.value = "";
        this.longitudeInput.value = "";
        this.infoPanel.innerHTML = "";
    }

    areFormValuesEmpty(){
        return this.longitudeInput.value == '' && this.latitudeInput.value == '';
    }

    highLightEmptiesInputs(){
        let inputs = [this.longitudeInput.value,this.latitudeInput.value == ''];
        inputs.forEach((input) => {
            if(input.value == ''){
                input.labels[0].classList.add("red-text");
                input.classList.add("red-border");
                input.addEventListener('input', () => {
                    input.classList.remove("red-border");
                    input.labels[0].classList.remove("red-text");
                })
            }
        })
    }

    areFormValuesValid(){
        let pattern = new RegExp('^-?([1-8]?[1-9]|[1-9]0)\\.{1}\\d{1,6}');
        let latErrorContainer = document.getElementById("latitude-error");
        let longErrorContainer = document.getElementById("longitude-error");
        latErrorContainer.innerText = "";
        longErrorContainer.innerText = "";
        let valid = false;
        if(!pattern.test(this.latitudeInput.value)){
            latErrorContainer.innerText = "format non valide";
        } else if(!pattern.test(this.longitudeInput.value)) {
            longErrorContainer.innerText = "format non valide";
        } else {
            valid = true;
        }
        return valid;
    }

    addRequest(){
        let messagePanel = document.getElementsByClassName("info_message")[1];
        let post = {
            "lat": this.latitudeInput.value,
            "long": this.longitudeInput.value,
            "action": "add"
        }
        $.ajax({
            url:"https://iot906836m1.herokuapp.com/api/source",
            type: 'POST',
            data: post,
            headers: {Accept: "application/json",},
            success: function (resultat, statut) {
                if(resultat == "source déjà existante"){
                    messagePanel.classList.add("red-text");
                } else {
                    messagePanel.classList.remove("red-text");
                }
                messagePanel.innerText=resultat;
            },
            error: function (resultat, statut, erreur) {
            },
            complete: function (resultat, statut) {
            }
        });
    }
}