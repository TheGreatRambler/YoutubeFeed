function codeToLoad () {
	var ws = new WebSocket ("wss://localhosttester.com:9002");
	var userChannelId;
	var userChannelName;

	// For testing
	window.YOUTUBE_FEED_LOADED = true;
	start ();

	function polymerClone (element) {
		var newElement = element.cloneNode(true);

		// Copying polymer elements is difficult
		for (var i in element.properties) {
			newElement[i] = element[i]
		}

		return newElement;
	}

	function obtainFormattedLength (timestamp) {
		var hours   = Math.floor(timestamp / 60 / 60);
		var minutes = Math.floor(timestamp / 60) - (hours * 60);
		var seconds = timestamp % 60;

		var result = (hours == 0 ? "" : hours + ":");
		result += minutes + ":" + seconds;

		return result;
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

			var data = {
				flag: "send_subscriptions",
				userId: userChannelId,
				data: channels
			};

			console.log(data);

			ws.send(JSON.stringify(data));
		});
	}

	function start () {
		// For now
		var serverIp = "localhosttester.com";

		console.log("Registering YoutTubeFeed hooks");
		// Sidebar
		var sidebarButtonIsLoaded = false;
		var looper                = setInterval (function () {
            var sidebarContainer = document.getElementById("section-items");

            if (sidebarContainer) {
                console.log("Creating button to YouTubeFeed");

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

		setTimeout (function () {
			// Obtain this user's channel ID
			document.getElementsByTagName("ytd-popup-container")[0].style.opacity = "0%";
			var possibleProfileButtons                                            = document.getElementsByTagName("ytd-topbar-menu-button-renderer");
			possibleProfileButtons[possibleProfileButtons.length - 1].onTap();

			var looper2 = setInterval (function () {
				if (document.getElementsByTagName("ytd-compact-link-renderer").length != 0) {
					clearInterval (looper2);

					userChannelId   = document.getElementsByTagName("ytd-compact-link-renderer")[0].__data.data.navigationEndpoint.browseEndpoint.browseId;
					userChannelName = document.getElementById("account-name").innerText;
					// Always send channel list on boot
					sendChannelList ();

					setTimeout (function () {
						document.getElementsByTagName("ytd-topbar-menu-button-renderer")[2].onTap();
						document.getElementsByTagName("ytd-popup-container")[0].style.opacity = "100%";
					}, 500);
				}
			}, 1000);
		}, 8000);

		// Notice every watchlist modification
		// The same 6 elements are moved around to service every video, so this needs to be applied every time one is found
		setInterval (function () {
			Array.from(document.getElementsByTagName("ytd-thumbnail-overlay-toggle-button-renderer")).forEach(function (item) {
				if (item.__data.data.untoggledTooltip == "Watch later") {
					item.children[1].onclick = function () {
						var video = item.parentElement.parentElement.__dataHost.__data.data;
						if (item.__data.toggled) {
							var data = {
								flag: "new_interaction",
								userId: userChannelId,
								user: userChannelName,
								id: video.videoId,
								title: video.title.runs ? video.title.runs[0].text : video.title.simpleText,
								length: video.lengthText ? video.lengthText.simpleText : video.thumbnailOverlays[0].thumbnailOverlayTimeStatusRenderer.text.simpleText,
								creator: video.longBylineText.runs[0].text,
								creatorId: video.longBylineText.runs[0].navigationEndpoint.browseEndpoint.browseId,
								verified: video.ownerBadges ? true : false,
								dateAdded: Date.now(),
								action: "Added to watchlist"
							};

							console.log(data);

							ws.send(JSON.stringify(data));
						} else {
							// Removed
						}
					}
				}
			})
		}, 50);

		// Watched videos, so there aren't repeats
		var watchedVideos = {};

		// Used to obtain watchtime and therefore to determine when it's a watch
		// Handled outside of the URL handling because Javascript references are difficult
		window.OriginalImage = window.Image;
		delete window.Image;
		window.Image = function () {
			this.innerImage = new window.OriginalImage();
		};

		Object.defineProperty(window.Image.prototype, "src", {
			get: function () {
				return this.innerImage.src;
			},
			set: function (source) {
				// Have obtained URL
				if (source.includes("api/stats/watchtime")) {
					console.log(source);

					var timestamp = parseFloat (source.substring(source.indexOf("&et=") + 4));
					if (timestamp > 30 && !watchedVideos[videoDetails.videoId]) {
						// This is a watch
						watchedVideos[videoDetails.videoId] = true;
						var data                            = {
                            flag: "new_interaction",
                            userId: userChannelId,
                            user: userChannelName,
                            id: videoDetails.videoId,
                            title: videoDetails.title,
                            length: obtainFormattedLength (Number.parseInt(videoDetails.lengthSeconds)),
                            creator: videoDetails.author,
                            creatorId: videoDetails.channelId,
                            verified: isVerified,
                            dateAdded: Date.now(),
                            action: "Watched"
						};

						console.log(data);

						ws.send(JSON.stringify(data));
					}
				}
				this.innerImage.src = source;
			}
		});

		Object.defineProperty(window.Image.prototype, "currentSrc", {
			get: function () {
				return this.innerImage.src;
			}
		});

		Object.defineProperty(window.Image.prototype, "onload", {
			get: function () {
				return this.innerImage.onload;
			},
			set: function (source) {
				this.innerImage.onload = source;
			}
		});

		Object.defineProperty(window.Image.prototype, "onerror", {
			get: function () {
				return this.innerImage.onerror;
			},
			set: function (source) {
				this.innerImage.onerror = source;
			}
		});

		var oldLocation = "";
		setInterval (function () {
			// In this instance, ignore
			//var isAstheticRedirection = oldLocation.includes("youtube.com/feed/subscriptions") && window.location.href.includes("youtube.com/feed/feed");
			//if (isAstheticRedirection) {
			//	oldLocation = window.location.href;
			//}

			if (oldLocation != window.location.href) {
				console.log("Detect page change: ", oldLocation, window.location.href);
				oldLocation = window.location.href;

				console.log("Starting YouTubeFeed on " + window.location.href);

				if (window.location.href.includes("youtube.com/feed/subscriptions") && localStorage.getItem("amRedirectingToFeed") == "1") {
					console.log("Preparing YouTubeFeed feed");
					// Pretend feed was opened
					localStorage.setItem("amRedirectingToFeed", "0");

					// TODO
					//window.history.pushState("", "", "/feed/feed");

					document.getElementById("title-container").firstElementChild.children[1].innerHTML = "This week";

					// Remove all extra ones
					var containerForRemoval = document.getElementsByClassName("style-scope ytd-two-column-browse-results-renderer")[0].firstElementChild.children[1];
					while (containerForRemoval.childNodes.length > 1) {
						containerForRemoval.removeChild(containerForRemoval.lastChild);
					}

					setTimeout (function () {
						var videosContainer = document.getElementsByClassName("style-scope ytd-two-column-browse-results-renderer")[0].firstElementChild.children[1].firstElementChild.children[2].firstElementChild.firstElementChild.children[1].firstElementChild.children[1];

						var templateVideo;
						// Can only use videos, not streams
						// Also needs to have a rich thumbnail
						for (var i = 0; i < videosContainer.children.length; i++) {
							var possibleElement = videosContainer.children[i];
							if (possibleElement.firstElementChild.children[1].children[1].children.length == 0 && possibleElement.__data.data.richThumbnail) {
								templateVideo = possibleElement;
								break;
							}
						}

						var templateChannelName = document.getElementsByTagName("ytd-channel-name")[0];

						console.log("Obtained template");

						// TODO will obtain data later
						// Video ids
						/*
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
						*/

						var looper1 = setInterval (function () {
							// User channel ID needs to exist first
							if (userChannelId) {
								clearInterval (looper1);

								var data = {
									flag: "request_entries",
									olderThan: Date.now(),
									quantity: 30,
									userId: userChannelId
								};

								console.log(data);

								ws.send(JSON.stringify(data));

								var videosToPresent = [];

								ws.addEventListener("message", function (event) {
									var data = JSON.parse(event.data);
									var flag = data.flag;
									console.log("Message recieved: ", flag);

									// Only run once
									if (flag == "recieve_entries" && videosToPresent.length == 0) {
										var alreadyAddedVideos = {};

										data.results.forEach(function (video) {
											if (!alreadyAddedVideos[video.id]) {
												var vid            = {};
												vid.id             = video.id;
												vid.title          = video.title;
												vid.length         = video.length;
												vid.creator        = video.creator;
												vid.creatorChannel = "https://www.youtube.com/channel/" + video.creatorId;
												vid.verified       = video.verified;
												vid.dateAdded      = video.dateAdded;
												vid.friends        = [{
                                                    friend: video.user,
                                                    friendChannel: "https://www.youtube.com/channel/" + video.userId
                                                }];
												vid.action         = video.action;

												alreadyAddedVideos[video.id] = vid;

												videosToPresent.push(vid);
											} else {
												alreadyAddedVideos[video.id].friends.push({
													friend: video.user,
													friendChannel: "https://www.youtube.com/channel/" + video.userId
												});
											}
										});

										console.log("Recieved videos: ", videosToPresent);

										videosContainer.textContent = "";

										videosToPresent.forEach(function (video) {
											console.log("Pasting video: ", video);

											var newVideo = polymerClone (templateVideo);

											newVideo.style.opacity = "0%";

											videosContainer.appendChild(newVideo);

											setTimeout (function () {
												var thumbnail = "https://i.ytimg.com/vi/" + video.id + "/hqdefault.jpg";
												// They're locked behind some sort of tracking key
												var movingThumbnail = "https://i.ytimg.com/an_webp/" + video.id + "/mqdefault_6s.webp?sqp=&rs=";
												var url             = "https://www.youtube.com/watch?v=" + video.id;

												console.log(newVideo);

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
													try {
														// This will trigger an exception in the backend, ignore
														newVideo.firstElementChild.children[1].firstElementChild.children[1].firstElementChild.children[0].firstElementChild.children[1].innerHTML = "";
													} catch (e) {
													}
												}

												newVideo.firstElementChild.children[1].firstElementChild.children[1].firstElementChild.children[1].children[0].innerHTML = "<p>" + video.action + " by </p>";
												var elementToAddAfter                                                                                                    = newVideo.firstElementChild.children[1].firstElementChild.children[1].firstElementChild.children[1].children[0].firstElementChild;

												video.friends.forEach(function (item, index) {
													var fakeChannelName = polymerClone (templateChannelName);

													console.log(fakeChannelName);

													fakeChannelName.__data.tooltipText                                                                   = item.friend;
													fakeChannelName.__data.channelName.runs[0].text                                                      = item.friend;
													fakeChannelName.__data.badges.length                                                                 = 0;
													fakeChannelName.__data.channelName.runs[0].navigationEndpoint.browseEndpoint.canonicalBaseUrl        = item.friendChannel;
													fakeChannelName.__data.channelName.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url = item.friendChannel;
													fakeChannelName.firstElementChild.firstElementChild.firstElementChild.firstElementChild.href         = item.friendChannel;

													elementToAddAfter.after(fakeChannelName);

													elementToAddAfter = fakeChannelName;

													if (index != video.friends.length - 1) {
														var delimiter = document.createTextNode(", ");
														elementToAddAfter.after(delimiter);
														elementToAddAfter = delimiter;
													}
												});

												var unneededViewsContainer = newVideo.firstElementChild.children[1].firstElementChild.children[1].firstElementChild.children[1];

												if (unneededViewsContainer.children.length == 3) {
													unneededViewsContainer.removeChild(unneededViewsContainer.children[1]);
												}

												newVideo.style.opacity = "100%";
											}, 3000);
										});
									}
								});
							}
						}, 1000);
					}, 2000);
				}

				if (window.location.href.includes("youtube.com/feed/feed")) {
					console.log("Redirecting to fake feed");
					localStorage.setItem("amRedirectingToFeed", "1");
					window.location.href = "/feed/subscriptions";
				}

				if (window.location.href.includes("youtube.com/watch?")) {
					setTimeout (function () {
						console.log("Creating video hooks");
						var videoDetails = document.getElementsByTagName("ytd-page-manager")[0].__data.data.playerResponse.videoDetails;
						var isVerified   = document.getElementsByTagName("ytd-video-owner-renderer")[0].children[1].firstElementChild.children[1].children.length == 2;

						// Listen for watch, like or watchlist
						var likeButton     = document.getElementsByTagName("ytd-toggle-button-renderer")[0];
						likeButton.onclick = function () {
							if (likeButton.__data.data.isToggled) {
								// Video was liked
								var data = {
									flag: "new_interaction",
									userId: userChannelId,
									user: userChannelName,
									id: videoDetails.videoId,
									title: videoDetails.title,
									length: obtainFormattedLength (Number.parseInt(videoDetails.lengthSeconds)),
									creator: videoDetails.author,
									creatorId: videoDetails.channelId,
									verified: isVerified,
									dateAdded: Date.now(),
									action: "Liked"
								};

								console.log(data);

								ws.send(JSON.stringify(data));
							}
						}

						var looper
							= setInterval (function () {
								  var watchlistCheckbox
									  = document.getElementsByTagName("tp-yt-paper-checkbox")[0];

								  if (watchlistCheckbox) {
									  clearInterval (looper);

									  watchlistCheckbox.onclick = function () {
										  if (watchlistCheckbox.__data.checked) {
											  // Video was added to watchlist
											  var data = {
												  flag: "new_interaction",
												  userId: userChannelId,
												  user: userChannelName,
												  id: videoDetails.videoId,
												  title: videoDetails.title,
												  length: obtainFormattedLength (Number.parseInt(videoDetails.lengthSeconds)),
												  creator: videoDetails.author,
												  creatorId: videoDetails.channelId,
												  verified: isVerified,
												  dateAdded: Date.now(),
												  action: "Added to watchlist"
											  };

											  console.log(data);

											  ws.send(JSON.stringify(data));
										  }
									  };
								  }
							  }, 50);
					}, 3000);

					document.getElementsByClassName("style-scope ytd-subscribe-button-renderer")[0].onclick = function () {
						sendChannelList ();
					};
				}

				if (window.location.href.includes("youtube.com/channel")) {
					// TODO add a follower system instead of by subscriptions
					/*
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
		*/

					document.getElementsByClassName("style-scope ytd-subscribe-button-renderer")[0].onclick = function () {
						sendChannelList ();
					};
				}
			}
		}, 1000)
	}
}

// Add script element to bypass firefox content script limitations
var script  = document.createElement('script');
script.type = 'text/javascript';
var code    = codeToLoad.toString() + "codeToLoad();";
script.appendChild(document.createTextNode(code));
document.body.appendChild(script);