var ws = new WebSocket ("ws://localhosttester.com:9002");

function polymerClone (element) {
	var newElement = element.cloneNode(true);

	// Copying polymer elements is difficult
	for (var i in element.properties) {
		newElement[i] = element[i]
	}

	return newElement;
}

function sendChannelList () {
	document.getElementsByTagName("yt-guide-manager")[0].fetchGuideData().then(function (subscriptions) {
		var channels = [];
		//var startingContainer = document.getElementsByTagName("ytd-guide-section-renderer")[1];
		var startingContainer = subscriptions.items[1].guideSubscriptionsSectionRenderer;
		startingContainer.items.concat(startingContainer.items[7].guideCollapsibleEntryRenderer.expandableItems).forEach(function (item) {
			if (item.guideEntryRenderer && item.guideEntryRenderer.entryData) {
				channels.push({
					id: item.guideEntryRenderer.entryData.guideEntryData.guideEntryId,
					name: item.guideEntryRenderer.formattedTitle.simpleText
				});
			}
		});

		ws.send(JSON.serialize({
			flag: "SendSubscriptions",
			data: channels
		}));
	});
}

//document.getElementsByTagName("ytd-topbar-menu-button-renderer")[2].onTap()

ws.onmessage = function (event) {
	var msg = JSON.parse(event.data);
};

document.onload = function () {
	// For now
	var serverIp = "localhosttester.com";

	var amRedirectingToFeed = localStorage.getItem("amRedirectingToFeed");
	if (window.location.href.includes("youtube.com/feed/subscriptions") && amRedirectingToFeed == "1") {
		// Pretend feed was opened
		localStorage.setItem("amRedirectingToFeed", "0");
		window.history.pushState("", "", "/feed/feed");

		// For some cursed reason, multiple containers are named items
		var possibleContainers = document.querySelectorAll("#items");
		var videosContainer;
		if (possibleContainers.length == 7) {
			videosContainer = possibleContainers[0];
		} else if (possibleContainers.length == 11) {
			videosContainer = possibleContainers[4];
		} else if (possibleContainers.length == 12) {
			videosContainer = possibleContainers[8];
		} else if (possibleContainers.length == 19) {
			videosContainer = possibleContainers[15];
		}

		var templateVideo;
		// Can only use videos, not streams
		for (var i = 0; i < videosContainer.children.length; i++) {
			var possibleElement = videosContainer.children[i];
			if (possibleElement.firstElementChild.children[1].children[1].children.length == 0) {
				templateVideo = possibleElement;
				break;
			}
		}

		// TODO will obtain data later
		// Video ids
		var videosToPresent = [{
			id: "dHsj51Db1Ec",
			title: "phone minecraft",
			length: "12:32",
			creator: "EazySpeezy",
			creatorChannel: "https://www.youtube.com/c/EazySpeezy",
			verified: true,
			// UNIX timestamp of when the person interacted with it
			dateAdded: 1612841880,
			// People who interacted with it
			friends: [{
				// Person who interacted
				friend: "Wifies",
				// URL of person who interacted with it
				friendChannel: "https://www.youtube.com/c/WifiesMC"
			}],
			// Action that resulted in a recommendation
			action: "Liked",
			// What action resulted in a recommendation
			// Date and views are essentially impossible to obtain without an API key
			// As such, they are ignored
		}];

		videosContainer.textContent = "";

		videosToPresent.forEach(function (video) {
			var newVideo = polymerClone (templateVideo);

			newVideo.style.opacity = "0%";

			videosContainer.appendChild(newVideo);

			setTimeout (function () {
				var thumbnail = "https://i.ytimg.com/vi/" + video.id + "/hqdefault.jpg";
				// They're locked behind some sort of tracking key
				var movingThumbnail = "https://i.ytimg.com/an_webp/" + video.id + "/mqdefault_6s.webp?sqp=&rs=";
				var url             = "https://www.youtube.com/watch?v=" + video.id;

				// TODO thumbnails out of view dont render when you scroll to them
				newVideo.__data.data.videoId                                                                        = video.id;
				newVideo.__data.data.thumbnail.thumbnails[0]                                                        = thumbnail;
				newVideo.__data.data.thumbnail.thumbnails[1]                                                        = thumbnail;
				newVideo.__data.data.thumbnail.thumbnails[2]                                                        = thumbnail;
				newVideo.__data.data.title.runs[0].text                                                             = video.title;
				newVideo.__data.data.richThumbnail.movingThumbnailRenderer.movingThumbnailDetails.thumbnails[0].url = movingThumbnail;
				newVideo.__data.data.navigationEndpoint.watchEndpoint.videoId                                       = video.id;
				// TODO the video wont appear if this is set
				//newVideo.__data.data.navigationEndpoint.watchEndpoint.commandMetadata.webCommandMetadata.url = "/watch?v=" + video.id;
				newVideo.__data.data.thumbnailOverlays[1].thumbnailOverlayToggleButtonRenderer.toggledServiceEndpoint.playlistEditEndpoint.actions[0].removedVideoId = video.id;

				Object.defineProperty(newVideo.__data.data.thumbnailOverlays[1].thumbnailOverlayToggleButtonRenderer.untoggledServiceEndpoint.playlistEditEndpoint.actions[0], "addedVideoId", {
					get: function () {
						// Video added to watchlist
						console.log("Added to watchlist");
						return video.id;
					}
				});

				newVideo.__data.data.thumbnailOverlays[2].thumbnailOverlayToggleButtonRenderer.untoggledServiceEndpoint.signalServiceEndpoint.actions[0].addToPlaylistCommand.videoId                                                    = video.id;
				newVideo.__data.data.thumbnailOverlays[2].thumbnailOverlayToggleButtonRenderer.untoggledServiceEndpoint.signalServiceEndpoint.actions[0].addToPlaylistCommand.videoIds                                                   = [video.id];
				newVideo.__data.data.thumbnailOverlays[2].thumbnailOverlayToggleButtonRenderer.untoggledServiceEndpoint.signalServiceEndpoint.actions[0].addToPlaylistCommand.onCreateListCommand.createPlaylistServiceEndpoint.videoIds = [video.id];

				if (video.verified) {
					newVideo.__data.data.ownerBadges = [{
						icon: {
							iconType: "CHECK_CIRCLE_THICK"
						},
						style: "BADGE_STYLE_TYPE_VERIFIED",
						tooltip: "Verified",
						// TODO once again locked behind tracking
						trackingParams: ""
					}];
				} else {
					newVideo.__data.data.ownerBadges = [];
				}

				newVideo.firstElementChild.children[0].firstElementChild.href                                    = url;
				newVideo.firstElementChild.children[0].firstElementChild.search                                  = "?v=" + video.id;
				newVideo.firstElementChild.children[1].firstElementChild.children[0].children[1]["aria-label"]   = video.title;
				newVideo.firstElementChild.children[0].firstElementChild.firstElementChild.firstElementChild.src = thumbnail;
				newVideo.firstElementChild.children[0].firstElementChild.firstElementChild.classList.remove("empty")
				newVideo.firstElementChild.children[1].firstElementChild.children[0].children[1].title                                                                                                           = video.title;
				newVideo.firstElementChild.children[1].firstElementChild.children[0].children[1].innerHTML                                                                                                       = video.title;
				newVideo.firstElementChild.children[1].firstElementChild.children[0].children[1].href                                                                                                            = url;
				newVideo.firstElementChild.children[0].firstElementChild.children[1].firstElementChild.children[1].innerHTML                                                                                     = "\n  " + video.length + "\n";
				newVideo.firstElementChild.children[1].firstElementChild.children[1].firstElementChild.children[0].firstElementChild.children[0].firstElementChild.firstElementChild.firstElementChild.innerHTML = video.creator;
				newVideo.firstElementChild.children[1].firstElementChild.children[1].firstElementChild.children[0].firstElementChild.children[0].firstElementChild.firstElementChild.firstElementChild.href      = video.creatorChannel;

				newVideo.firstElementChild.children[1].firstElementChild.children[1].firstElementChild.firstElementChild.firstElementChild.children[0].children[1].firstElementChild.innerHTML = "\n      \n    " + video.creator + "\n  \n    ";

				if (!video.verified) {
					newVideo.firstElementChild.children[1].firstElementChild.children[1].firstElementChild.children[0].firstElementChild.children[1].innerHTML = "";
				}

				newVideo.firstElementChild.children[1].firstElementChild.children[1].firstElementChild.children[1].children[0].innerHTML = video.action + " by " + video.friends.map(item => `<a href="${item.friendChannel}">${item.friend}</a>`).join(", ");

				var unneededViewsContainer = newVideo.firstElementChild.children[1].firstElementChild.children[1].firstElementChild.children[1];

				if (unneededViewsContainer.children.length == 3) {
					unneededViewsContainer.removeChild(unneededViewsContainer.children[1]);
				}

				newVideo.style.opacity = "100%";
			}, 1000);
		});
	}

	if (window.location.href.includes("youtube.com/feed/feed")) {
		localStorage.setItem("amRedirectingToFeed", "1");
		window.location.href = "/feed/subscriptions";
	}

	if (window.location.href.includes("youtube.com/watch?")) {
		// Listen for watch, like or watchlist
		var likeButton     = document.getElementsByTagName("ytd-toggle-button-renderer")[0];
		likeButton.onclick = function () {
			if (likeButton.__data.data.isToggled) {
				// Video was liked
				// window.ytplayer.config.args
			}
		}

		var watchlistCheckbox
			= document.getElementsByTagName("tp-yt-paper-checkbox")[0];
		watchlistCheckbox.onclick = function () {
			if (watchlistCheckbox.__data.checked) {
				// Video was added to watchlist
				// window.ytplayer.config.args
			}
		}
	}

	if (window.location.href.includes("youtube.com/channel")) {
		var possibleButtons          = document.getElementsByTagName("ytd-subscribe-button-renderer");
		var subscribeButtonContainer = possibleButtons[possibleButtons.length - 1];

		var newSubscribeButton = document.createElement("ytd-subscribe-button-renderer");

		subscribeButtonContainer.parentElement.appendChild(newSubscribeButton);

		var alreadyFollowed = true;

		newSubscribeButton.__data.buttonAccessibility                      = "Follow this channel";
		newSubscribeButton.firstElementChild.firstElementChild.innerText   = "FOLLOW";
		newSubscribeButton.__data.data.unsubscribedButtonText.runs[0].text = "Unfollow";
		newSubscribeButton.__data.data.unsubscribedButtonText.runs[0].text = "";

		document.getElementsByTagName("ytd-guide-section-renderer")[1].__data.data.items.concat(document.getElementsByTagName("ytd-guide-section-renderer")[1].children[1].children[7].__data.data.expandableItems)
	}

	if (window.location.href.includes("youtube.com")) {
		// Sidebar
		var sidebarButtonIsLoaded = false;
		var looper                = setInterval (function () {
            var sidebarContainer = document.getElementById("section-items");

            if (sidebarContainer) {
                clearInterval (looper);
                sidebarButtonIsLoaded = true;

                var newFeedElement = polymerClone (sidebarContainer.firstElementChild);

                sidebarContainer.insertBefore(newFeedElement, sidebarContainer.children[1]);

                newFeedElement.firstElementChild.title                                               = "Feed";
                newFeedElement.firstElementChild.href                                                = "/feed/feed";
                newFeedElement.__data.data.formattedTitle.simpleText                                 = "Feed";
                newFeedElement.__data.data.navigationEndpoint.commandMetadata.webCommandMetadata.url = "/feed/feed";

                newFeedElement.firstElementChild.firstElementChild.children[2].innerHTML                         = "Feed";
                newFeedElement.firstElementChild.firstElementChild.firstElementChild.firstElementChild.outerHTML = `
				<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;" class="style-scope yt-icon" height="100%" width="100%" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" enable-background="new 0 0 200 200" xml:space="preserve">
					<rect x="82.833" y="31.855" width="67.469" height="6.134"></rect>
					<rect x="82.833" y="44.123" width="21.468" height="6.134"></rect>
					<rect x="46.032" y="31.855" width="21.468" height="21.468"></rect>
					<rect x="82.833" y="145.326" width="67.469" height="6.134"></rect>
					<rect x="82.833" y="157.594" width="21.468" height="6.134"></rect>
					<rect x="46.032" y="145.326" width="21.468" height="21.468"></rect>
					<path d="M168.429,7H30.887C24.559,7,19,12.452,19,18.783v160.461C19,185.575,24.559,191,30.887,191h137.542  c6.327,0,11.571-5.425,11.571-11.756V18.783C180,12.452,174.756,7,168.429,7z M168,19v44H31V19H168z M83,95v-6h67v6H83z M104,101v6  H83v-6H104z M67,89v21H46V89H67z M31,179v-46h137v46H31z"></path>
				</svg>
					`;
            }
        }, 30);

		// Always send channel list on boot
		sendChannelList ();
	}
};