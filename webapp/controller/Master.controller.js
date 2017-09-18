sap.ui.define([
	"sap/ui/core/mvc/Controller",
	'sap/m/MessageToast'
], function(Controller, MessageToast) {
	"use strict";

	return Controller.extend("IoTService_WFApp.controller.Master", {

		onInit: function() {

			//sap.ui.core.BusyIndicator.show();
			var oModel = new sap.ui.model.json.JSONModel();
			oModel.refresh(true);
			jQuery.ajax({
				type: "GET",
				url: "https://sycor-trial.eu10.cp.iot.sap:443/iot/core/api/v1/devices/3/measures?top=5",
				cache: false,
				headers: {
					"Authorization": "Basic " + "<pw>"
				},
				crossDomain: true,
				async: false,
				contentType: "application/json",
				success: function(data, textStatus, jqXHR) {
					//sap.ui.core.BusyIndicator.hide();
					oModel.setData(data);
					sap.ui.getCore().setModel(oModel, "SensorModel");
					console.log("SUCCESS");
				//	console.log(oModel);
				},
				error: function(xhr, status) {
					console.log("ERROR");
				}
			});

			var oTable = new sap.m.Table({
				growing: true,
				growingThreshold: 5,
				growingScrollToLoad: true,
				footerText: "Static table footer text",
				itemPress: function(e) {
					sap.m.MessageToast.show("item is pressed");
				}
			});
			//sap.ui.core.BusyIndicator.show();

			oTable = this.getView().byId("wfmeasuretable");
			oTable.setMode(sap.m.ListMode.SingleSelectMaster);
			oTable.bindItems("/", new sap.m.ColumnListItem({

					cells: [

						new sap.m.Text({
							text: "{sensorId}"
						}),
						new sap.m.Text({
							text: "{capabilityId}"
						}),
						new sap.m.Text({
							text: "{timestamp}"
						}),
						new sap.m.Text({
							text: "{measure/Temperature}"
						})
					]

				})

			);
			//this.getView().setModel(oModel);

			this.getView().byId("wfmeasuretable").setModel(oModel);
		},

		getMeasures: function(oEvent) {

		}

	});

});