sap.ui.define([
	"sap/ui/core/UIComponent",
		
	'sap/m/Button',
	'sap/m/Label',
	'sap/m/TextArea',
	"sap/ui/Device",
	"IoTService_WFApp/model/models",
	'sap/m/Dialog',
	'sap/m/MessageToast'
], function(UIComponent, Button, Label, TextArea, Device, models, Dialog, MessageToast) {
	"use strict";

	return UIComponent.extend("IoTService_WFApp.Component", {

		metadata: {
			manifest: "json"
		},

		init: function() {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);
			// set the device model
			this.setModel(models.createDeviceModel(), "device");
			var startupParameters = this.getComponentData().startupParameters;
			var taskModel = startupParameters.taskModel;
			var taskData = taskModel.getData();
			var taskId = taskData.InstanceID;
			var that = this;
			var jsonModel = new sap.ui.model.json.JSONModel();

			$.ajax({
				url: "/bpmworkflowruntime/rest/v1/task-instances/" + taskId + "/context",
				method: "GET",
				contentType: "application/json",
				dataType: "json",
				success: function(result, xhr, data) {
					// 3. Binding a UI Element to an Attribute of the Task Context JSON Model
					var processContext = new sap.ui.model.json.JSONModel();
					processContext.context = data.responseJSON;
					//set context for Ticket Creation
					processContext.context.iot = {};
					processContext.context.iot.message = "Alert at Sensor: " + processContext.context.sensorId + " plaease investigate";
					processContext.context.iot.alertlevel = processContext.context.alertLevel;
					processContext.context.iot.capabilityId = processContext.context.capabilityId;
					processContext.context.iot.Sensorname = processContext.context.SensorDetail.name;
					processContext.context.iot.deviceId = processContext.context.SensorDetail.deviceId;
					processContext.context.iot.sensorTypeId = processContext.context.SensorDetail.sensorTypeId;
					processContext.context.iot.alternateId = processContext.context.SensorDetail.alternateId;
					processContext.context.iot.Temperature = processContext.context.measure.Temperature;
					processContext.context.iot.timestamp = processContext.context.timestamp;

					if (processContext.context.alertLevel === "FATAL" || processContext.context.alertLevel === "Fatal") {
						taskData.Priority = "VERY HIGH";
					} else if (processContext.context.alertLevel === "ERROR" || processContext.context.alertLevel === "Error") {
						taskData.Priority = "HIGH";
					} else {
						processContext.context.task.PriorityState = "Success";
					}

					processContext.context.TableModel = {};
					processContext.context.task = {};
					processContext.context.task.Title = taskData.TaskTitle;
					processContext.context.task.Priority = taskData.Priority;
					processContext.context.task.Status = taskData.Status;

					if (taskData.Priority === "HIGH") {
						processContext.context.task.PriorityState = "Warning";
					} else if (taskData.Priority === "VERY HIGH") {
						processContext.context.task.PriorityState = "Error";
					} else {
						processContext.context.task.PriorityState = "Success";
					}
					processContext.context.task.CreatedOn = taskData.CreatedOn.toDateString();

					// 4. Getting the Task Description
					startupParameters.inboxAPI.getDescription("NA", taskData.InstanceID).done(function(dataDescr) {
						processContext.context.task.Description = dataDescr.Description;
						jsonModel.setProperty("/context/task/Description", dataDescr.Description);
					}).
					fail(function(errorText) {
						jQuery.sap.require("sap.m.MessageBox");
						sap.m.MessageBox.error(errorText, {
							title: "Error"
						});
					});

					jsonModel.setData(processContext);
					that.setModel(jsonModel);
				}
			});

			// 5. Adding Approve and Reject Buttons
			var oNegativeAction = {
				sBtnTxt: "Reject",

				onBtnPressed: function(e) {

					var model = that.getModel();
					var processContext = model.getData().context;
					var iot = JSON.stringify(processContext.iot.text);

					that._triggerReject(that.oComponentData.inboxHandle.attachmentHandle.detailModel.getData().InstanceID, false,
						jQuery.proxy(
							that._refreshTask, that));
				}
			};

			/*	var oPositiveAction = {
					sBtnTxt: "Create Ticket",
					onBtnPressed: function(e) {
						
								var model = that.getModel();
								var processContext = model.getData().context;
								console.log(processContext);
								var iot = JSON.stringify(processContext.iot);
								that._triggerComplete(iot, that.oComponentData.inboxHandle.attachmentHandle.detailModel.getData().InstanceID, true,
								jQuery.proxy(
									that._refreshTask, that));
					}*/

			var oPositiveAction = {
				sBtnTxt: "Create Ticket",
				onBtnPressed: function(e) {
					var dialog = new Dialog({
						title: 'Confirm',
						type: 'Message',
						content: [
							new Label({
								text: 'Are you sure you want to submit to C4S ?',
								labelFor: 'submitDialogTextarea'
							}),
							new TextArea('submitDialogTextarea', {
								liveChange: function(oEvent) {
									var sText = oEvent.getParameter('value');
									var parent = oEvent.getSource().getParent();

									parent.getBeginButton().setEnabled(sText.length > 0);
								},
								width: '100%',
								placeholder: 'Add note (required)'
							})
						],
						beginButton: new Button({
							text: 'Submit',
							enabled: false,
							press: function() {
								var model = that.getModel();
								var processContext = model.getData().context;
								processContext.iot.message = sap.ui.getCore().byId('submitDialogTextarea').getValue();
								MessageToast.show('Note is: ' + processContext.iot.message);
								dialog.close();
								console.log(processContext);
								var iot = JSON.stringify(processContext.iot);
								that._triggerComplete(iot, that.oComponentData.inboxHandle.attachmentHandle.detailModel.getData().InstanceID, true,
									jQuery.proxy(
										that._refreshTask, that));
							}

						}),

						endButton: new Button({
							text: 'Cancel',
							press: function() {
								dialog.close();
							}
						}),
						afterClose: function() {
							dialog.destroy();
						}

					});
					dialog.open();
				}

			};

			startupParameters.inboxAPI.addAction({
				action: oPositiveAction.sBtnTxt,
				label: oPositiveAction.sBtnTxt,
				type: "Accept"
			}, oPositiveAction.onBtnPressed);

			startupParameters.inboxAPI.addAction({
				action: oNegativeAction.sBtnTxt,
				label: oNegativeAction.sBtnTxt,
				type: "Reject"
			}, oNegativeAction.onBtnPressed);

		},

		// 6. Implementing Task Completion action
		_triggerComplete: function(iot, taskId, approvalStatus, refreshTask) {
			// 6.1 Fetching an XSRF Token
			$.ajax({
				url: "/bpmworkflowruntime/rest/v1/xsrf-token",
				method: "GET",
				headers: {
					"X-CSRF-Token": "Fetch"
				},
				success: function(result, xhr, data) {
					// 6.2 Calling the Task Completion REST API
					var token = data.getResponseHeader("X-CSRF-Token");
					$.ajax({
						url: "/bpmworkflowruntime/rest/v1/task-instances/" + taskId,
						method: "PATCH",
						contentType: "application/json",

						data: "{\"status\":\"COMPLETED\",\"context\": {\"iotApproved\": \"" + approvalStatus + "\" , \"iot\" : " + iot + "}}",

						headers: {
							"X-CSRF-Token": token
						},
						success: refreshTask
					});
				}

			});
		},

		// 6. Implementing Task Completion action
		_triggerReject: function(taskId, approvalStatus, refreshTask) {
			// 6.1 Fetching an XSRF Token
			$.ajax({
				url: "/bpmworkflowruntime/rest/v1/xsrf-token",
				method: "GET",
				headers: {
					"X-CSRF-Token": "Fetch"
				},
				success: function(result, xhr, data) {
					// 6.2 Calling the Task Completion REST API
					var token = data.getResponseHeader("X-CSRF-Token");
					$.ajax({
						url: "/bpmworkflowruntime/rest/v1/task-instances/" + taskId,
						method: "PATCH",
						contentType: "application/json",

						data: "{\"status\":\"COMPLETED\",\"context\": {\"iotApproved\": \"" + approvalStatus + "\" }}",

						headers: {
							"X-CSRF-Token": token
						},
						success: refreshTask
					});
				}

			});
		},

		// 7. Updating the Task List After Task Completion
		_refreshTask: function() {
			var taskId = this.getComponentData().startupParameters.taskModel.getData().InstanceID;
			this.getComponentData().startupParameters.inboxAPI.updateTask("NA", taskId);
		}

	});
});