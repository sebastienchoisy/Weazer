

class Modal {
    constructor(){
        this.modal = document.getElementById("modal");
        this.btn = document.getElementById("sub_button");
        this.closeSpan = document.getElementsByClassName("close")[0];
        this.userInput = document.getElementById("utilisateur");
        this.identInput = document.getElementById("identifiant");
        this.secretInput = document.getElementById("mot_secret");
        this.subBtn = document.getElementById("subscribe_button");
        this.infoPanel = document.getElementById("info_message");
        this.unsubBtn = document.getElementById("unsub_button");
        this.initModal();
    }

    initModal() {
        this.btn.addEventListener("click", () => {
            this.modal.style.display = "block";
        });
        this.closeSpan.addEventListener("click", () => {
            this.modal.style.display = "none";
        });
        this.subBtn.addEventListener("click", () => {
            if(this.AreFormValuesEmpty()){
                this.highLightEmptiesInputs();
                this.infoPanel.innerText="Tous les champs sont obligatoires !"
            } else if(this.AreFormValuesValid()) {
                this.subscriptionRequest();
            }
        });
        this.unsubBtn.addEventListener("click", () => {
            if(this.AreFormValuesEmpty()){
                this.highLightEmptiesInputs();
                this.infoPanel.innerText="Tous les champs sont obligatoires !"
            } else if(this.AreFormValuesValid()) {
                this.cancellationRequest();
            }
        });


    }

    AreFormValuesEmpty(){
        return this.userInput.value == '' && this.identInput.value == '' && this.secretInput.value == '';
    }

    highLightEmptiesInputs(){
        let inputs = [this.userInput,this.identInput,this.secretInput];
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

    AreFormValuesValid(){
        let macRegexWithDelimitor = new RegExp('^([0-9a-fA-F]{2}[:.-]){5}[0-9a-fA-F]{2}$');
        let macRegexWithoutDelimitor = new RegExp('^([0-9a-fA-F]{2}[:.-]?){5}[0-9a-fA-F]{2}$')
        let userErrorContainer = document.getElementById("utilisateur-error");
        let identErrorContainer = document.getElementById("identifiant-error");
        let secretErrorContainer = document.getElementById("secret-error");
        secretErrorContainer.innerText = "";
        userErrorContainer.innerText = "";
        identErrorContainer.innerText = "";
        let valid = false;
        if(this.userInput.value.length>12){
            userErrorContainer.innerText = "taille maximum : 12 caractères";
        } else if(this.identInput.value.length !== 17 || !(macRegexWithDelimitor.test(this.identInput.value) || macRegexWithoutDelimitor.test(this.identInput.value))) {
            identErrorContainer.innerText = "Adresse Mac invalide";
        } else if(this.secretInput.value>12){
            secretErrorContainer.innerText = "taille maximum : 12 caractères";
        } else {
            valid = true;
        }
        return valid;
    }
    subscriptionRequest(){
        let messagePanel = document.getElementById("info_message");
        let post = {
            "user": this.userInput.value,
            "ident": this.identInput.value,
            "secret": this.secretInput.value
        }
        $.ajax({
            url:"http://localhost:3000/esp/registration",
            type: 'POST',
            data: post,
            headers: {Accept: "application/json",},
            success: function (resultat, statut) {
                if(resultat == "Inscription réussie"){
                    messagePanel.classList.remove("red-text");
                } else {
                    messagePanel.classList.add("red-text");
                }
                messagePanel.innerText=resultat;
            },
            error: function (resultat, statut, erreur) {
            },
            complete: function (resultat, statut) {
            }
        });
    }

    cancellationRequest(){
        let messagePanel = document.getElementById("info_message");
        let post = {
            "user": this.userInput.value,
            "ident": this.identInput.value,
            "secret": this.secretInput.value
        }
        $.ajax({
            url: "http://localhost:3000/esp/cancellation",
            type: 'POST',
            data: post,
            headers: {Accept: "application/json",},
            success: function (resultat, statut) {
                if(resultat == "Désinscription réussie"){
                    messagePanel.classList.remove("red-text");
                } else {
                    messagePanel.classList.add("red-text");
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