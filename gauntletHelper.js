// SDK's Gauntlet Helper - http://duelyst.world/scripts/gauntletHelper.js
var GauntletHelperModule = function () {
    // Steam causes problems when full screen since it zooms in, not sure how to fix yet
    // Can probably do visible all through css, just can't use show/hide if so
    // Clean up CSS and reused code in general

    var TEST = false;

    var rankingsUrl = 'https://docs.google.com/document/d/1r3tX0myAjXHo-EzGmQ2v3E-P2fLCB-8lcCdKkRzeQq0'
    var rankingsUrlTxt = rankingsUrl + '/export?format=txt';
    var rankingRegEx = /^([a-zA-Z0',\- ]*?)[\-– ]*\(([a-zA-Z0-9 ]*)\)[ ]*[\-–][ ]*(.+)/;
    var genRegEx = /^\s*([a-zA-Z']*):[ ]*([a-zA-Z0',\- ]*?)[\-– ]*\([a-zA-Z]*[ ]*([0-9\-]*)\)[ ]*[\-–][ ]*(.+)/;
    var genRankingRegEx = /^#([0-9]+)[-– ]+([a-zA-Z' ]+?) [-–] .*/;
    var parentDiv = '#app-overlay-region';
    var gauntletDiv = '#app-arena';
    var generalDivTitle = '';
    var generalNames = ['Zirix', 'Sajj', 'Lilithe', 'Cassyva', 'Argeon', 'Ziran', 'Faie', 'Kara', 'Vaath', 'Starhorn', 'Kaleos', 'Reva'];

    var steam;

    var rankings;
    var generalRankings;
    var generalNotes;
    var gauntletModel;

    var generalDiv;
    var generalVisible;
    var cardDivs;
    var cardsVisible;
    
    var currentGeneral;
    var currentCards;

    var divsCreated = false;
    var cardsVerified = false;
    var generalSet = false;

    var createDivs = function() {
        if (!divsCreated && $(parentDiv).length) {
            var width = 420;
            var height = 245;
            var marginBottom = 190;
            var separation = 6;

            var style = {
                position: 'absolute',
                bottom: '50%',
                left: '50%',
                backgroundColor: '1E1E1E',
                padding: 3,
                'overflow-y': 'hidden',
                'border-radius': 8,
                border: 'solid lightyellow',
                borderWidth: '1px',
                zIndex: 1000
            };

            var cardStyle = {
                width: width,
                height: height,
                'margin-bottom': marginBottom
            };

            var generalDivWidth = (width * 3) + (separation * 2);
            generalDiv = $('<div />').css(style).css({
                width: generalDivWidth,
                height: 'auto',
                'margin-bottom': marginBottom + height + separation,
                'margin-left': (-generalDivWidth / 2 - 320)
            }).appendTo($(parentDiv).css('position', 'relative'));

            var textStyle = {
                'line-height': '1em',
                color: 'white'
            };

            generalDiv.html(generalDivTitle);

            cardDivs = [3];

            // Card IDs are backwards, so these are backwards to fix it
            cardDivs[2] = $('<div />').css(style).css(cardStyle).css({ 'margin-left': (-width / 2) - (width + separation) - 320 })
                .appendTo($(parentDiv).css('position', 'relative'));

            cardDivs[1] = $('<div />').css(style).css(cardStyle).css({ 'margin-left': (-width / 2) - 320 })
                .appendTo($(parentDiv).css('position', 'relative'));

            cardDivs[0] = $('<div />').css(style).css(cardStyle).css({ 'margin-left': (-width / 2) + (width + separation) - 320 })
                .appendTo($(parentDiv).css('position', 'relative'));

            // Setting visibility to hidden in the CSS seems to make it always hidden, so doing this instead
            setGeneralVisible(false);
            setCardsVisible(false);

            divsCreated = true;
        }
    }

    var updateCard = function(i) {
        var name = getCardName(currentCards[i]);
        if (name in rankings) {
            cardDivs[i].html('<p align=center style="font-size:.7em;line-height:1em;color:orange">' + name + '</p><p align=center style="font-size:1em;line-height:1em;color:khaki">' + rankings[name].ranking + '</p><p style="font-size:0.7em;line-height:1em;color:9CD0C6">' + rankings[name].description + '</p>');
        } else{
            cardDivs[i].html('<p align=center style="font-size:1em;line-height:1em;color:9CD0C6">\'' + name + '\' not found in rankings.</p>');
        }
    }

    var getCardName = function(cardId) {
        var models = window.GameDataManager.getInstance().cardsCollection.models;
        for (var i = 0; i < models.length; i++) {
            if (models[i].id == cardId) {
                return models[i].attributes.name.toUpperCase();
            }
        }

        console.log("Gauntlet Helper - card ID '" + cardId + "' not found in Duelyst database.");
        return 'UNKNOWN';
    }

    var verifyCardName = function(cardName) {
        var models = window.GameDataManager.getInstance().cardsCollection.models;
        for (var i = 0; i < models.length; i++) {
            if (models[i].attributes.name.toUpperCase() === cardName) {
                return true;
            }
        }

        return false;
    }

    var getSplitIndex = function(strings) {
        // Splitting by character count works for some generals but hurts for Faie who has the biggest comment list. So just do this for now.
        return Math.ceil(strings.length / 2);

        var splitIndex = 0;
        var splitDelta = Number.MAX_SAFE_INTEGER;

        for (var i = 0; i < strings.length; i++) {
            var leftSize = 0;
            var rightSize = 0;

            for (var j = 0; j < strings.length; j++) {
                if (j <= i) {
                    leftSize += strings[j].length;
                } else {
                    rightSize += strings[j].length;
                }
            }

            var delta = Math.abs(rightSize - leftSize);
            if (delta < splitDelta) {
                splitIndex = i;
                splitDelta = delta;
            } else {
                break;
            }
        }

        // splitIndex will be set to the last one we want on the left, so increase it by one to make it the first we want on the right
        return splitIndex + 1;
    }

    var updateGeneralText = function(notes) {
        var result = '<table width="100%"><tr>';
        var i = 0;

        var splitIndex = getSplitIndex(notes);

        while (i < notes.length) {
            if (i == splitIndex) {
                result += '</ul></td>';
            }
            if (i == 0 || i == splitIndex) {
                result += '<td width="50%" valign="top"><ul style="font-size:0.7em;line-height:1em;color:9CD0C6;list-style-type:disc;padding-left:1.5em">';
            }

            result += '<li>' + notes[i] + '</li>';
            i++;
        }

        result += '</ul></td></tr></table>';
        return result;
    }

    var updateGeneral = function(general) {
        if (currentGeneral != general || !generalSet) {
            currentGeneral = general;

            if (general == null) {
                var generalRankingsText = [];
                for (var i = 0; i < generalRankings.length; i++) {
                    generalRankingsText.push(generalRankings[i].rank + ": " + generalRankings[i].name);
                }

                generalDiv.html('<p style="font-size:0.7em;line-height:1em;color:white">' + updateGeneralText(generalRankingsText) + '</p>' + generalDivTitle);
            } else {
                if (TEST) {
                    general = 501; // Faie has the most notes
                }

                var name = getCardName(general).split(' ')[0];;
                if (name in generalNotes) {
                    generalDiv.html('<p style="font-size:0.7em;line-height:1em;color:white">' + updateGeneralText(generalNotes[name]) + '</p>' + generalDivTitle);
                } else{
                    generalDiv.html('<p style="font-size:0.7em;line-height:1em;color:white">\'' + name + '\' not found in rankings.</p>' + generalDivTitle);
                }
            }

            generalSet = true;
        }
    }

    var updateCards = function(cards) {
        if (TEST) {
            cards = [20280, 30020, 14];
        }

        if (currentCards == null) {
            currentCards = cards;

            for (var i = 0; i < cards.length; i++) {
                updateCard(i);
            }
        } else {
            for (var i = 0; i < cards.length; i++) {
                if (currentCards[i] != cards[i]) {
                    currentCards[i] = cards[i];
                    updateCard(i);
                }
            }
        }
    }

    var cleanText = function(text) {
        return text.replace("’", "'").replace('\r','');
    }

    var formatName = function(name) {
        return name.toUpperCase()
            .replace("AUTARACH'S GIFT", "AUTARCH'S GIFTS")
            .replace("TIME MAELSTORM", "TIME MAELSTROM")
            .replace("SKULL PROPHET", "SKULLPROPHET")
            .replace("GHOST AZELEA", "GHOST AZALEA")
            .replace("OBILTERATE", "OBLITERATE")
            .replace("LASTING JUDGMENT", "LASTING JUDGEMENT")
            .replace("VESPRYIAN MIGHT", "VESPYRIAN MIGHT")
            .replace("OBILTERATE", "OBLITERATE")
            .replace("DRAKE DOWNAGER", "DRAKE DOWAGER")
            .replace("ICEBREAKER AMBUSH", "ICEBREAK AMBUSH")
            .replace("MOLOKI HUNTRESSES", "MOLOKI HUNTRESS")
            .replace("PUTRID DREADFLYER", "PUTRID DREADFLAYER")
            .replace("INQUISTOR KRON", "INQUISITOR KRON")
            .replace("BEASTBOUND SAGE", "BEASTBOUND SAVAGE")
            .replace("S.I.L.V.E.R", "S.I.L.V.E.R.");
    }

    var parseRatings = function(text) {
        rankings = [];
        generalRankings = [];
        generalNotes = [];

        var inGeneralNotes = false;
        var inGeneral;

        var lines = text.split('\n');
        for (var i = 0; i < lines.length; i++) {
            lines[i] = cleanText(lines[i]);

            if (inGeneralNotes) {
                if (lines[i].startsWith('*')) {
                    generalNotes[inGeneral].push(lines[i].replace('*', '').trim());
                } else {
                    inGeneralNotes = false;
                }
            }

            // Separate because inGeneralNotes can change between checks
            if (!inGeneralNotes) {
                var match = rankingRegEx.exec(lines[i]);
                if (match != null) {
                    rankings[formatName(match[1])] = {
                        ranking: match[2],
                        description: match[3]
                    };
                } else {
                    match = genRegEx.exec(lines[i]);
                    if (match != null) {
                        var name = formatName(match[2]);
                        if (name in rankings) {
                            rankings[name] = {
                                ranking: rankings[name].ranking + ' - ' + match[1] + ': ' + match[3],
                                description: rankings[name].description + ' ' + match[1] + ': ' + match[4]
                            };
                        } else {
                            console.log("Gauntlet Helper - custom ranking encountered before base ranking for card: " + name);
                        }
                    } else {
                        match = genRankingRegEx.exec(lines[i]);
                        if (match != null) {
                            generalRankings.push({
                                rank: match[1], 
                                name: match[2]
                            });
                        } else {
                            for (var j = 0; j < generalNames.length; j++) {
                                if (lines[i].trim() === generalNames[j]) {
                                    inGeneral = generalNames[j].toUpperCase();
                                    inGeneralNotes = true;

                                    generalNotes[inGeneral] = [];
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        generalRankings.sort(function(a,b) { return a.rank - b.rank; });

        for (var j = 0; j < generalNames.length; j++) {
            if (!(generalNames[j].toUpperCase() in generalNotes)) {
                console.log("Gauntlet Helper - general notes for '" + generalNames[j] + "' not found.");
            }
        }

        console.log("Gauntlet Helper - Ratings Loaded");
    }

    var loadRatings = function() {
        $.ajax({
            type: "GET",
            url: rankingsUrlTxt,
            dataType: "text",
            success: function(response) {
                parseRatings(response);
            },
            error: function(response) {
                alert('Gauntlet Helper - error getting gauntlet rankings: ' + response.statusText)
            }
        });
    }

    var loaded = function() {
        return divsCreated
            && rankings != null
            && Session.userId != null
            && window.GameDataManager.getInstance().cardsCollection != null
            && window.GameDataManager.getInstance().cardsCollection.models.length > 0;
    }

    var showGeneral = function(deck) {
        if (TEST) {
            return $(gauntletDiv).length;
        } else {
            return $(gauntletDiv).length && (deck == null || deck.length != 31);
        }
    }

    var showCards = function() {
        if (TEST) {
            return showGeneral();
        } else {
            return showGeneral() && gauntletModel.attributes.card_choices != null;
        }
    }

    var setGeneralVisible = function(show) {
        if (show) {
            generalDiv.show();
        } else {
            generalDiv.hide();
        }

        generalVisible = show;
    }

    var setCardsVisible = function(show) {
        for (var i = 0; i < cardDivs.length; i++) {
            if (show) {
                cardDivs[i].show();
            } else {
                cardDivs[i].hide();
            }
        }

        cardsVisible = show;
    }

    var verifyCards = function() {
        if (!cardsVerified) {
            for (var name in rankings) {
                if (!verifyCardName(name)) {
                    console.log('Gauntlet Helper - unknown card in rankings: ' + name);
                }
            }

            cardsVerified = true;
            console.log("Gauntlet Helper - Cards Verified");
        }
    }

    var createGauntletModel = function() {
        if (gauntletModel == null) {
            var firebase = new Firebase("https://duelyst-production.firebaseio.com/").child("user-gauntlet-run").child(this.Session.userId).child("current");
            gauntletModel = new Backbone.DuelystFirebase.Model(null, {
                firebase: firebase
            });
        }
    }

    setInterval(function() {
        createDivs();

        if (loaded()) {
            createGauntletModel();

            if (showGeneral(gauntletModel.attributes.deck)) {
                updateGeneral(gauntletModel.attributes.general_id);
                
                if (!generalVisible) {
                    setGeneralVisible(true);
                }
            } else if (generalVisible) {
                setGeneralVisible(false);
            }

            if (showCards()) {
                verifyCards();
                updateCards(gauntletModel.attributes.card_choices);

                if (!cardsVisible) {
                    setCardsVisible(true);
                }
            } else if (cardsVisible) {
                setCardsVisible(false);
            }
        }
    }, 1000);

    steam = typeof isSteam === 'undefined' || !isSteam ? false : true;
    loadRatings();
    console.log("Gauntlet Helper - Loaded");
};

var gauntletHelper = new GauntletHelperModule();
