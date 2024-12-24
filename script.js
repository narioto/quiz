$(document).ready(function () {
    // Variables principales
    let nomUtilisateur = ""; // Nom de l'utilisateur
    let questionActuelle = 0; // Index de la question actuelle
    let donneesQuiz = []; // Données complètes du quiz
    let questionsAleatoires = []; // Questions sélectionnées aléatoirement
    let resultats = []; // Résultats de l'utilisateur

    // Identifier la page actuelle
    const estPageQuiz = window.location.pathname.includes('quiz.html');
    const estPageResultats = window.location.pathname.includes('results.html');

    // Gestion de la page quiz
    if (estPageQuiz) {
        // Récupérer le nom de l'utilisateur dans l'URL
        const parametresURL = new URLSearchParams(window.location.search);
        nomUtilisateur = parametresURL.get('user');

        // Afficher le nom de l'utilisateur (ou "Utilisateur" par défaut)
        $('#userGreeting').text(nomUtilisateur || 'Utilisateur');

        // Charger les données du quiz
        chargerDonneesQuiz();

        // Gérer le formulaire pour avancer dans les questions
        $('#quizForm').on('submit', function (e) {
            e.preventDefault();
            gererReponse();
        });
    }

    // Gestion de la page des résultats
    if (estPageResultats) {
        // Charger les résultats et le nom de l'utilisateur depuis le stockage local
        resultats = JSON.parse(localStorage.getItem('resultats')) || [];
        nomUtilisateur = localStorage.getItem('nomUtilisateur') || 'Utilisateur';

        // Afficher le nom de l'utilisateur
        $('#userGreeting').text(nomUtilisateur);

        // Générer le tableau des résultats
        const tableauResultats = $('#resultsTable');
        let scoreTotal = 0;

        resultats.forEach((resultat, index) => {
            scoreTotal += resultat.score;
            tableauResultats.append(`
                <tr>
                    <td><span class="question-link" data-index="${index}">${index + 1}</span></td>
                    <td>${resultat.score}</td>
                </tr>
            `);
        });

        tableauResultats.append(`
            <tr>
                <td><strong>Total</strong></td>
                <td><strong>${scoreTotal}/10</strong></td>
            </tr>
        `);

        // Gérer l'affichage des images et descriptions au survol
        $('.question-link').on('mouseover', function () {
            const index = $(this).data('index');
            const resultat = resultats[index];

            $('#questionImage').attr('src', `http://localhost:8888/TP02/data/${resultat.question}`).show();
            $('#questionDescriptionTitle').text(resultat.categorieCorrecte);
            $('#questionDescriptionText').text(resultat.descriptionCorrecte);
        });
    }

    // Fonction pour charger les données du quiz
    function chargerDonneesQuiz() {
        $.ajax({
            method: 'GET',
            dataType: 'json',
            url: 'http://localhost:8888/TP02/data.php/?data=images',
            success: function (donnees) {
                donneesQuiz = donnees.images;

                // Sélectionner 10 questions aléatoires
                questionsAleatoires = donneesQuiz.sort(() => 0.5 - Math.random()).slice(0, 10);
        
                chargerQuestion();
            },
            error: function () {
                alert("Erreur lors du chargement des questions.");
            }
        });
    }

    // Fonction pour charger une question
    function chargerQuestion() {
        if (questionActuelle < questionsAleatoires.length) {
            const image = questionsAleatoires[questionActuelle];
            $('#quizImage').attr('src', `http://localhost:8888/TP02/data/${image}`);

            // Réinitialiser les boutons radio et leurs labels
            $('input[name="category"]').prop('checked', false).val('');
            $('input[name="description"]').prop('checked', false).val('');

            // Charger la description correcte pour l'image actuelle
            $.ajax({
                method: 'GET',
                dataType: 'json',
                url: `http://localhost:8888/TP02/data.php/?data=response&image=${image}`,
                success: function (reponse) {
                    const descriptionCorrecte = reponse.description;

                    // Charger les propositions pour cette question
                    $.ajax({
                        method: 'GET',
                        dataType: 'json',
                        url: 'http://localhost:8888/TP02/data.php/?data=propositions',
                        success: function (donnees) {
                            let descriptionsMelangees = donnees.propositions.sort(() => 0.5 - Math.random()).slice(0, 4);

                            // Ajouter la description correcte si elle n'est pas déjà dans les propositions
                            if (!descriptionsMelangees.includes(descriptionCorrecte)) {
                                descriptionsMelangees.pop();
                                descriptionsMelangees.push(descriptionCorrecte);
                            }

                            // Mélanger à nouveau les propositions
                            descriptionsMelangees = descriptionsMelangees.sort(() => 0.5 - Math.random());

                            // Mettre à jour les boutons radio avec les propositions
                            $('input[name="description"]').each(function (index) {
                                $(this).val(descriptionsMelangees[index]);
                                $(this).next('label').text(descriptionsMelangees[index]);
                            });
                        }
                    });
                }
            });

            // Charger les catégories
            $.ajax({
                method: 'GET',
                dataType: 'json',
                url: 'http://localhost:8888/TP02/data.php/?data=categories',
                success: function (donnees) {
                    $('input[name="category"]').each(function (index) {
                        $(this).val(donnees.categories[index]);
                        $(this).next('label').text(donnees.categories[index]);
                    });
                }
            });
        } else {
            // Enregistrer les résultats et rediriger vers la page des résultats
            localStorage.setItem('resultats', JSON.stringify(resultats));
            localStorage.setItem('nomUtilisateur', nomUtilisateur);
            window.location.href = "results.html";
        }
    }

    // Fonction pour gérer la réponse de l'utilisateur
    function gererReponse() {
        const categorieSelectionnee = $('input[name="category"]:checked').val();
        const descriptionSelectionnee = $('input[name="description"]:checked').val();
        const image = questionsAleatoires[questionActuelle];

        if (!categorieSelectionnee || !descriptionSelectionnee) {
            alert('Veuillez sélectionner une catégorie et une description.');
            return;
        }

        // Vérifier si la réponse est correcte
        $.ajax({
            method: 'GET',
            dataType: 'json',
            url: `http://localhost:8888/TP02/data.php/?data=response&image=${image}`,
            success: function (donnees) {
                let score = 0;

                // Calculer le score en fonction des réponses
                if (categorieSelectionnee === donnees.category && descriptionSelectionnee === donnees.description) {
                    score = 1;
                } else if (categorieSelectionnee === donnees.category || descriptionSelectionnee === donnees.description) {
                    score = 0.5;
                }

                // Enregistrer le résultat pour cette question
                resultats.push({
                    question: image,
                    categorieSelectionnee: categorieSelectionnee,
                    descriptionSelectionnee: descriptionSelectionnee,
                    categorieCorrecte: donnees.category,
                    descriptionCorrecte: donnees.description,
                    score: score,
                });

                questionActuelle++;
                chargerQuestion();
            }
        });
    }
});
