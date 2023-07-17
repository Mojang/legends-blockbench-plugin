//ONLY WORKS ON BEDROCK ENTITY!!!!
//All the @ts-ignore are due to blockbench-types not being as up to date as the blockbench source 
(function () {
	var codec: Codec = new Codec('minecraftLegends', {
		name: 'Exported Json',
		extension: 'json',
		remember: false,

		compile(scale: any) {
			let bones: any = []; // Converted Minecraft Legends bones

			// Turns a Group (blockbensh bone) into a Minecraft Legends bone including any locators in that bone.
			function addBone(group: Group) {
				// Find all locators for this bone
				let locators: Locator[] = [];
				Locator.all.forEach(locator => {
					if (locator.parent === group) {
						locators.push(locator);
					}
				});

				let parentOrigin = group.parent !== "root" ? group.parent.origin : [0, 0, 0];
				let newPivot = [(group.origin[0] - parentOrigin[0]) * scale, (group.origin[1] - parentOrigin[1]) * scale, (group.origin[2] - parentOrigin[2]) * scale];

				let bone: object = {
					"\u0001\u0002\u0003\u0004\u0005__": {
						"bind_pose_rotation": group.rotation
					},
					"name": group.name.toLowerCase(),
					"parent": group.parent !== "root" ? group.parent.name.toLowerCase() : "",
					"pivot": newPivot,
					"scale": [1, 1, 1]
				};

				// Add locators to bone
				if (locators.length > 0) {
					let compiledLocators: { [key: string]: any } = {};
					locators.forEach(element => {
						let uname = `${element.createUniqueName()}`
						compiledLocators[uname] = {
							"discard_scale": true,
							// The offset y is reversed. *-1
							"offset": [element.mesh.position.x * scale, (element.mesh.position.y * scale) * -1, element.mesh.position.z * scale],
							"rotation": [element.mesh.rotation._x, element.mesh.rotation._y, element.mesh.rotation._z]
						}
					});
					// @ts-ignore
					bone.locators = compiledLocators;
				}

				bones.push(bone);
			}

			let rootBoneExist = undefined

			Group.all.forEach(group => {
				if(group.name == "minecraft_geometry_root_bone"){
					rootBoneExist = group
				}
			})
			// Add a root bone if there is none present
			if(rootBoneExist == undefined){
				rootBoneExist = new Group({
					name: 'minecraft_geometry_root_bone'
				}).init();
			}
			// Add all unattached bones to the root bone
			Group.all.forEach(group => {
				if (group.parent === "root" && group != rootBoneExist) {
					group.addTo(rootBoneExist)
				}
			})

			// Add all groups/bones (a Group is a Bone)
			Group.all.forEach(group => {
				if (!group.export)
					return;
				addBone(group);
			})

			// Convert all exportable cubes into Blockbench Meshes.
			// Cubes are defined by their center and size, and Meshes are defined by vertices and faces.
			// So this will create 8 vertices and 6 faces per cube.
			// Most of this code is taken form blockbench source "mesh_editing.js at line 736".
			// Meshes gives us access to helper functions like geting a sorted array of vertices and looping over all faces.
			function convertCubesToMeshes() {
				let new_meshes = [];
				Cube.all.forEach(cube => {
					// No need to process cubes that won't be exported
					if (!cube.export)
						return;

					let mesh = new Mesh({
						// @ts-ignore
						name: cube.name,
						// @ts-ignore
						color: cube.color,
						origin: cube.origin,
						rotation: cube.rotation,
						// @ts-ignore
						vertices: []
					});
					let cubeOrgin = [0, 0, 0]; // This is needed for Minecraft Legends
					mesh.parent = cube.parent;
					let vertex_keys = [
						mesh.addVertices([cube.to[0] + cube.inflate - cubeOrgin[0], cube.to[1] + cube.inflate - cubeOrgin[1], cube.to[2] + cube.inflate - cubeOrgin[2]])[0],
						mesh.addVertices([cube.to[0] + cube.inflate - cubeOrgin[0], cube.to[1] + cube.inflate - cubeOrgin[1], cube.from[2] - cube.inflate - cubeOrgin[2]])[0],
						mesh.addVertices([cube.to[0] + cube.inflate - cubeOrgin[0], cube.from[1] - cube.inflate - cubeOrgin[1], cube.to[2] + cube.inflate - cubeOrgin[2]])[0],
						mesh.addVertices([cube.to[0] + cube.inflate - cubeOrgin[0], cube.from[1] - cube.inflate - cubeOrgin[1], cube.from[2] - cube.inflate - cubeOrgin[2]])[0],
						mesh.addVertices([cube.from[0] - cube.inflate - cubeOrgin[0], cube.to[1] + cube.inflate - cubeOrgin[1], cube.to[2] + cube.inflate - cubeOrgin[2]])[0],
						mesh.addVertices([cube.from[0] - cube.inflate - cubeOrgin[0], cube.to[1] + cube.inflate - cubeOrgin[1], cube.from[2] - cube.inflate - cubeOrgin[2]])[0],
						mesh.addVertices([cube.from[0] - cube.inflate - cubeOrgin[0], cube.from[1] - cube.inflate - cubeOrgin[1], cube.to[2] + cube.inflate - cubeOrgin[2]])[0],
						mesh.addVertices([cube.from[0] - cube.inflate - cubeOrgin[0], cube.from[1] - cube.inflate - cubeOrgin[1], cube.from[2] - cube.inflate - cubeOrgin[2]])[0],
					];
					let unused_vkeys = vertex_keys.slice();
					function addFace(direction: string, vertices: any[], parentObj: any) {
						let cube_face = cube.faces[direction];
						if (cube_face.texture === null)
							return;
						let uv = {
							[vertices[0]]: [cube_face.uv[2], cube_face.uv[1]],
							[vertices[1]]: [cube_face.uv[0], cube_face.uv[1]],
							[vertices[2]]: [cube_face.uv[2], cube_face.uv[3]],
							[vertices[3]]: [cube_face.uv[0], cube_face.uv[3]],
						};
						mesh.addFaces(new MeshFace(mesh, {
							vertices,
							uv,
							// @ts-ignore
							texture: cube_face.texture
						}));
						vertices.forEach((vkey: any) => unused_vkeys.remove(vkey));
					}
					addFace('east', [vertex_keys[1], vertex_keys[0], vertex_keys[3], vertex_keys[2]], cube.parent);
					addFace('west', [vertex_keys[4], vertex_keys[5], vertex_keys[6], vertex_keys[7]], cube.parent);
					addFace('up', [vertex_keys[1], vertex_keys[5], vertex_keys[0], vertex_keys[4]], cube.parent); // 4 0 5 1
					addFace('down', [vertex_keys[2], vertex_keys[6], vertex_keys[3], vertex_keys[7]], cube.parent);
					addFace('south', [vertex_keys[0], vertex_keys[4], vertex_keys[2], vertex_keys[6]], cube.parent);
					addFace('north', [vertex_keys[5], vertex_keys[1], vertex_keys[7], vertex_keys[3]], cube.parent);
					unused_vkeys.forEach(vkey => {
						delete mesh.vertices[vkey];
					})
					new_meshes.push(mesh);
				})
				return new_meshes;
			}

			// Minecraft Legends Meshes
			let compiledMeshes: any = [];

			// Converts a Blockbensh Mesh into a Minecraft Legends Mesh.
			// A Minecraft Legends Mesh is a skinned mesh, defined by vertices and triangles, where the vertices
			// are specified in the bind pose.
			// Each vertex here has a single bone with a bone weight of 1.
			function addMesh(mesh: Mesh) {
				let normal_sets = [];
				let positions = [];
				let triangles = [];
				let uv = [];
				let weights = [];
				let indices = [];

				// Rotate a single point around all ancestor bones, walking up the hierarchy.
				// This places the point in the bind pose.
				function rotatePointBasedOnParents(point: ArrayVector3, mesh: any): number[] {
					let pp = mesh.parent;

					let rx = Math.degToRad(mesh.rotation[0])
					let ry = Math.degToRad(mesh.rotation[1])
					let rz = Math.degToRad(mesh.rotation[2])
					let roX = rotateAroundAxisX([point[0], point[1], point[2]], mesh.origin, rx)
					let roy = rotateAroundAxisY(roX, mesh.origin, ry)
					let roz = rotateAroundAxisZ(roy, mesh.origin, rz)

					let x1 = roz[0];
					let y1 = roz[1];
					let z1 = roz[2];

					while (pp.parent != "root") {
						let radianseX = Math.degToRad(pp.rotation[0])
						let radianseY = Math.degToRad(pp.rotation[1])
						let radianseZ = Math.degToRad(pp.rotation[2])
						let rotateX = rotateAroundAxisX([x1, y1, z1], pp.origin, radianseX)
						let rotateY = rotateAroundAxisY(rotateX, pp.origin, radianseY)
						let rotateZ = rotateAroundAxisZ(rotateY, pp.origin, radianseZ)

						x1 = rotateZ[0];
						y1 = rotateZ[1];
						z1 = rotateZ[2];

						pp = pp.parent
					}
					return [x1, y1, z1];
				}

				// Add hard-coded triangle indices
				function addTriangels() {
					// triangle 1
					triangles.push(positions.length - 4); //1
					triangles.push(positions.length - 3); //2
					triangles.push(positions.length - 2); //3
					// tritriangle 2
					triangles.push(positions.length - 2); //3
					triangles.push(positions.length - 1); //4
					triangles.push(positions.length - 4); //1

				}

				// Convert each face into triangles (transformed into the bind pose).
				mesh.forAllFaces((m, k) => {
					let vertices = m.getSortedVertices();
					vertices.forEach(vkey => {
						// Add rotated normals.
						// Note that rotating normals the same way as positions is not generally acceptable,
						// because normals should by rotated by the inverse transpose of the upper-3x3 portion
						// of the tranformation matrix.  However, in this case, since bones only support rotation
						// and not scale, both will be the same.
						let rotatedNormals: number[] = rotatePointBasedOnParents(m.getNormal(false), mesh);
						let normalLength = Math.sqrt(rotatedNormals[0] * rotatedNormals[0] + rotatedNormals[1] * rotatedNormals[1] + rotatedNormals[2] * rotatedNormals[2])
						normal_sets.push([rotatedNormals[0] / normalLength, rotatedNormals[1] / normalLength, rotatedNormals[2] / normalLength, 0]);

						// Add rotated positions
						let rotatedPos: number[] = rotatePointBasedOnParents(mesh.vertices[vkey], mesh);
						positions.push([rotatedPos[0] * scale, rotatedPos[1] * scale, rotatedPos[2] * scale]);

						// Adds the UVs
						uv.push([m.uv[vkey][0] / Project.texture_width, m.uv[vkey][1] / Project.texture_height]);

						// Add a single bone weight
						weights.push([1]);

						// Adds the single bone name
						// @ts-ignore
						indices.push([mesh.parent.name.toLowerCase()])
					})
					addTriangels();
				})

				let tex: TextureData = Object.values(mesh.faces)[0].getTexture() as TextureData;

				// We need the name for the meta_material 
				let metaMaterialName: string = tex != undefined? "mat_" + tex.name.replace(".png", "") : "";

				let compliedMesh = {
					"meta_material": metaMaterialName,
					"normal_sets": [normal_sets],
					"positions": positions,
					"triangles": triangles,
					"uv_sets": [uv],
					"weights": weights,
					"indices": indices
				}

				compiledMeshes.push(compliedMesh)
			}

			// Convert cubes to Minecraft Legends Meshes
			convertCubesToMeshes().forEach((m: Mesh) => {
				addMesh(m);
			})

			// Compile the final Json with the converted bones and meshes
			let model = {
				"format_version": "1.14.0",
				"minecraft:geometry": [
					{
						"bones": bones,
						"meshes": compiledMeshes,
						"description": {
							"identifier": "geometry." + Project.model_identifier
						}
					}
				]
			}

			return JSON.stringify(model);
		},

		write(content: string, path: string) {
			Blockbench.writeFile(path, {
				content: content,
				savetype: "text",
				custom_writer: undefined
			}, path => this.afterSave(path));
		},

		// @ts-ignore
		export_options: {
			scale: { label: 'settings.model_export_scale', type: 'number', value: 1 },
			include_alpha: { label: 'Alpha Test', type: 'checkbox', value: true },
			include_animations: { label: 'codec.common.export_animations', type: 'checkbox', value: true }
		},

		async export() {
			if (Object.keys(this.export_options).length) {
				if (await this.promptExportOptions() === null) {
					return;
				}
			}
			let options: any;
			options = Object.assign(this.getExportOptions(), options);

			// Scale the model to fit Minecraft Legends ratio
			options.scale = options.scale / 16

			if (options.include_animations) {
				let form: any = {};
				let keys: any = [];
				let animations = Blockbench.Animation.all.slice();

				if (Format.animation_files)
					animations.sort((a1: any, a2: any) => a1.path.hashCode() - a2.path.hashCode());

				animations.forEach(animation => {
					// @ts-ignore
					let key = animation.name;
					keys.push(key)
					form[key.hashCode()] = { label: key, type: 'checkbox', value: true };
				})

				let dialog = new Dialog({
					id: 'animation_export',
					title: 'dialog.animation_export.title',
					form,
					onConfirm(form_result) {
						dialog.hide();
						keys = keys.filter((key: any) => form_result ? [key.hashCode()] : Number);
						MassExport(options, keys);
					}
				})
				form.select_all_none = {
					type: 'buttons',
					buttons: ['generic.select_all', 'generic.select_none'],
					click(index: any) {
						let values = {};
						keys.forEach(key => values[key.hashCode()] = (index == 0));
						dialog.setFormValues(values);
					}
				}
				dialog.show();
			} else {
				MassExport(options, undefined);
			}
		},

		export_action: new Action('export_minecraftLegends', {
			name: 'Minecraft Legends Exporter',
			icon: 'icon-format_block',
			category: 'export',
			condition: () => Format.id == "bedrock" || Format.id == "bedrock_old",
			click: function () {
				if (codec.export !== undefined) {
					codec.export();
				}
			}
		})
	})

	// Register the exporter
	BBPlugin.register('minecraftLegendsExporter', {
		title: 'Minecraft Legends Exporter',
		icon: 'icon',
		author: 'House Of How',
		description: 'Convert a Minecraft Bedrock model into a Minecraft Legends model.',
		variant: 'both',

		onload() {
			MenuBar.menus.file.addAction(codec.export_action, 'export');
		},
		onunload() {
			this.onuninstall();
		},
		onuninstall() {
			codec.export_action.delete();
		}
	})

	 /**
	 * Rotate a point around the line that passes through pivot and is parallel to the z-axis
	 * @param point Point to rotate around the z-axis.
	 * @param pivot Pivot point.
	 * @param radians Rotation amount.
	 * @returns New position of the point after the rotation.
	 */
	function rotateAroundAxisZ(point: ArrayVector3, pivot: ArrayVector3, radians: number) {
		var cosTheta = Math.cos(radians);
		var sinTheta = Math.sin(radians);

		var x = (cosTheta * (point[0] - pivot[0]) - sinTheta * (point[1] - pivot[1]) + pivot[0]);
		var y = (sinTheta * (point[0] - pivot[0]) + cosTheta * (point[1] - pivot[1]) + pivot[1]);

		return [x, y, point[2]] as ArrayVector3;
	}
	 /**
	 * Rotate a point around the line that passes through pivot and is parallel to the y-axis
	 * @param point Point to rotate around the y-axis.
	 * @param pivot Pivot point.
	 * @param radians Rotation amount.
	 * @returns New position of the point after the rotation.
	 */
	function rotateAroundAxisY(point: ArrayVector3, pivot: ArrayVector3, radians: number) {
		var cosTheta = Math.cos(radians);
		var sinTheta = Math.sin(radians);

		var x = (cosTheta * (point[0] - pivot[0]) + sinTheta * (point[2] - pivot[2]) + pivot[0]);
		var Z = (-sinTheta * (point[0] - pivot[0]) + cosTheta * (point[2] - pivot[2]) + pivot[2]);

		return [x, point[1], Z] as ArrayVector3;
	}

	 /**
	 * Rotate a point around the line that passes through pivot and is parallel to the x-axis
	 * @param point Point to rotate around the x-axis.
	 * @param pivot Pivot point.
	 * @param radians Rotation amount.
	 * @returns New position of the point after the rotation.
	 */
	function rotateAroundAxisX(point: ArrayVector3, pivot: ArrayVector3, radians: number) {
		var cosTheta = Math.cos(radians);
		var sinTheta = Math.sin(radians);

		var y = (cosTheta * (point[1] - pivot[1]) - sinTheta * (point[2] - pivot[2]) + pivot[1]);
		var z = (sinTheta * (point[1] - pivot[1]) + cosTheta * (point[2] - pivot[2]) + pivot[2]);

		return [point[0], y, z] as ArrayVector3;
	}

	/**
	* Export material, geometry and animations.
	* @param options Options for include_alpha and scale.
	* @param keys Animations keys of animations to export.
	*/
	function MassExport(options: { include_alpha: boolean; scale: object; }, keys: any) {
		let targetPath: string = Blockbench.pickDirectory({ title: "Export_Save_Location" });
		if (targetPath === null) {
			return;
		}
		let textures = GetUniqueTextures();
		for (let index = 0; index < textures.length; index++) {
			let texture = textures[index];

			if(texture == undefined){
				continue;
			}

			let metaMaterialJson = CreateMcLegendsMetaMaterialFromTexture(texture, options.include_alpha);
			let metaMaterialJsonPath = targetPath + `\\mat_${Project.model_identifier}.${codec.extension}`;
			codec.write(metaMaterialJson, metaMaterialJsonPath)
		}
		let modelPath = targetPath + `\\${Project.model_identifier}.model.${codec.extension}`;
		codec.write(codec.compile(options.scale), modelPath);

		Texture.all.forEach(tex => {
			// @ts-ignore
			let name = tex.name;
			if (name.substr(-4).toLowerCase() !== '.png') {
				name += '.png';
			}
			let texturePath = targetPath + `\\tex_${name}`;
			Blockbench.writeFile(texturePath, {
				// @ts-ignore
				content: tex.source,
				savetype: "image",
				custom_writer: undefined
			})
		});

		if (keys !== undefined) {
			let animationsPath = targetPath + `\\${Project.model_identifier}.animations.${codec.extension}`;
			let content = JSON.stringify(buildMcLegendsAnimationFile(null, keys, options));
			codec.write(content, animationsPath);
		}
	}

	/**
	 * Gets all unique textures 
	 * @returns TextureData[]
	 */
	function GetUniqueTextures(): TextureData[] {
		let uniqTextures: TextureData[] = []
		Blockbench.Cube.all.forEach(cube => {
			if (!cube.export)
				return;

			for (const key in cube.faces) {
				if (!uniqTextures.includes(cube.faces[key].getTexture() as TextureData)) {
					uniqTextures.push(cube.faces[key].getTexture() as TextureData)
				}
			}
		})
		return uniqTextures
	}

	/**
	 * Create a material JSON from a texture.
	 * @param texture TextureData
	 * @param includeAlpha True if texture uses alpha for transparency
	 * @returns Json string.
	 */
	function CreateMcLegendsMetaMaterialFromTexture(texture: TextureData, includeAlpha: boolean): string {
		let textureName = texture.name as string;
		let textureNameNoExtension = textureName.substring(0, textureName.lastIndexOf('.png'))
		let textureNameBaseEntity = "mat_" + textureNameNoExtension + ":base_entity";
		let texturePath = "textures/entity/" + "tex_" + textureNameNoExtension

		let metaMaterialJson: string;
		if (includeAlpha) {
			metaMaterialJson = `{"format_version": "1.8.0","${textureNameBaseEntity}": {"pass": "AlphaTest","textures": {"diffuseMap": "${texturePath}"}}}`;
		} else {
			metaMaterialJson = `{"format_version": "1.8.0","${textureNameBaseEntity}": {"textures": {"diffuseMap": "${texturePath}"}}}`;
		}
		return metaMaterialJson;
	}


	/**
	* Create an animation JSON for each animtion that passes the filters
	* Slightly modefied code from Blockbench source.
	* @param path_filter Path filter.
	* @param name_filter Name filter.
	* @param settings The models export settings
	* @returns MC legends Animations.
	*/
	function buildMcLegendsAnimationFile(path_filter: any, name_filter, settings): Object {
		var animations = {}
		// @ts-ignore
		Animator.animations.forEach(function (a) {
			if ((typeof path_filter != 'string' || a.path == path_filter || (!a.path && !path_filter)) && (!name_filter || !name_filter.length || name_filter.includes(a.name))) {
				let ani_tag = compileMcLegendsAnimation(a, settings.scale);
				animations[a.name] = ani_tag;
			}
		})

		return {
			format_version: '1.8.0',
			animations: animations
		}
	}


	/**
	* Convert from a Blockbench animation to a Minecraft Legends animation.
	* Slightly modefied code from Blockbench source.
	* @param anim Blockbench animation.
	* @param scale The scale of the model.
	* @returns MC legends Animation.
	*/
	function compileMcLegendsAnimation(anim: any, scale: number): any {

		let ani_tag: any = {}

		ani_tag.anim_time_update = "(query.anim_time + (query.delta_time * 1))" // This is needed for Minecraft Legends 
		ani_tag.blend_weight = "1" // This is needed for Minecraft Legends 

		if (anim.loop == 'hold') {
			ani_tag.loop = 'hold_last_frame';
		} else if (anim.loop == 'loop' || anim.getMaxLength() == 0) {
			ani_tag.loop = true;
		}
		//if (this.length) ani_tag.animation_length = this.length;
		if (anim.override) ani_tag.override_previous_animation = true;
		//if (this.anim_time_update) ani_tag.anim_time_update = this.anim_time_update.replace(/\n/g, '');
		if (anim.blend_weight) ani_tag.blend_weight = anim.blend_weight.replace(/\n/g, '');
		if (anim.start_delay) ani_tag.start_delay = anim.start_delay.replace(/\n/g, '');
		if (anim.loop_delay && ani_tag.loop) ani_tag.loop_delay = anim.loop_delay.replace(/\n/g, '');
		ani_tag.bones = {};

		for (var uuid in anim.animators) {
			var animator = anim.animators[uuid];
			if (!animator.keyframes.length && !animator.rotation_global)
				continue;
			if (animator instanceof EffectAnimator) {
				// @ts-ignore
				animator.sound.sort((kf1, kf2) => (kf1.time - kf2.time)).forEach(kf => {
					if (!ani_tag.sound_effects) ani_tag.sound_effects = {};
					ani_tag.sound_effects[kf.getTimecodeString()] = kf.compileBedrockKeyframe();
				})
				// @ts-ignore
				animator.particle.sort((kf1, kf2) => (kf1.time - kf2.time)).forEach(kf => {
					if (!ani_tag.particle_effects) ani_tag.particle_effects = {};
					ani_tag.particle_effects[kf.getTimecodeString()] = kf.compileBedrockKeyframe();
				})
				// @ts-ignore
				animator.timeline.sort((kf1, kf2) => (kf1.time - kf2.time)).forEach(kf => {
					if (!ani_tag.timeline) ani_tag.timeline = {};
					ani_tag.timeline[kf.getTimecodeString()] = kf.compileBedrockKeyframe()
				})

			} else if (animator.type == 'bone') {

				var group = animator.getGroup();
				var bone_tag: any = ani_tag.bones[group ? group.name : animator.name] = {};
				bone_tag.lod_distance = 0.0;  // This is needed for Minecraft Legends 
				if (animator.rotation_global) {
					bone_tag.relative_to = { rotation: 'entity' };
					bone_tag.rotation = [0, 0, 0.01];
				}

				// Adds a extra keyframe to a channel, if there is only one. (Minecraft Legends can't handle just one).
				// @ts-ignore
				for (var channel in Animator.possible_channels) {
					if (!animator[channel]?.length)
						continue;
					if (animator[channel].length == 1) {
						// @ts-ignore
						var keyframe = new Keyframe({
							channel: animator[channel][0].channel,
							time: animator[channel][0].time + 0.1,
							data_points: animator[channel][0].data_points
							// @ts-ignore
						}, guid(), animator);
						// @ts-ignore
						animator[channel][1] = keyframe;
					}
				}

				// @ts-ignore
				for (var channel in Animator.possible_channels) {
					if (!animator[channel]?.length)
						continue;

					// Saving Keyframes
					bone_tag[channel] = {};

					let sorted_keyframes = animator[channel].slice().sort((a, b) => a.time - b.time);

					sorted_keyframes.forEach((kf, i) => {
						let timecode = kf.getTimecodeString();
						bone_tag[channel][timecode] = kf.compileBedrockKeyframe();
						if (kf.channel == 'position') {
							// Blockbench appears to swap the x component relative to Minecraft
							bone_tag[channel][timecode][0] = (bone_tag[channel][timecode][0] * (scale)) * -1;
							bone_tag[channel][timecode][1] = bone_tag[channel][timecode][1] * (scale);
							bone_tag[channel][timecode][2] = bone_tag[channel][timecode][2] * (scale);

							if (kf.interpolation == 'catmullrom') {
								// Blockbench appears to swap the x component relative to Minecraft
								bone_tag[channel][timecode]["post"][0] = (bone_tag[channel][timecode]["post"][0] * (scale)) * -1;
								bone_tag[channel][timecode]["post"][1] = bone_tag[channel][timecode]["post"][1] * (scale);
								bone_tag[channel][timecode]["post"][2] = bone_tag[channel][timecode]["post"][2] * (scale);

								// Remove variable keys to fit the Minecraft Legends format
								delete bone_tag[channel][timecode]["0"];
								delete bone_tag[channel][timecode]["1"];
								delete bone_tag[channel][timecode]["2"];
								delete bone_tag[channel][timecode]["pre"];
							}
						}


						if (animator.rotation_global && kf.channel == 'rotation' && bone_tag[kf.channel][timecode] instanceof Array && bone_tag[kf.channel][timecode].allEqual(0)) {
							bone_tag[kf.channel][timecode][2] = 0.01;
						}


						if (kf.channel == 'rotation') {
							if (kf.interpolation == 'catmullrom') {
								// Remove variable keys to fit the Minecraft Legends format
								delete bone_tag[channel][timecode]["0"];
								delete bone_tag[channel][timecode]["1"];
								delete bone_tag[channel][timecode]["2"];
								delete bone_tag[channel][timecode]["pre"];

								// Blockbench appears to swap the x (and y?) component relative to Minecraft
								bone_tag[channel][timecode]["post"][0] = bone_tag[kf.channel][timecode]["post"][0] * -1;
								bone_tag[channel][timecode]["post"][1] = bone_tag[kf.channel][timecode]["post"][1] * -1;

							} else {
								// Blockbench appears to swap the x (and y?) component relative to Minecraft
								bone_tag[kf.channel][timecode][0] = bone_tag[kf.channel][timecode][0] * -1;
								bone_tag[kf.channel][timecode][1] = bone_tag[kf.channel][timecode][1] * -1;
							}

						}

						// Bake bezier keyframe curve
						let next_keyframe = sorted_keyframes[i + 1];
						if (next_keyframe && (kf.interpolation === 'bezier' || next_keyframe.interpolation === 'bezier')) {
							let interval = 1 / anim.snapping;
							let interpolated_values = {};
							for (let time = kf.time + interval; time < next_keyframe.time + (interval / 2); time += interval) {
								let itimecode = trimFloatNumber(Timeline.snapTime(time, anim)).toString();
								if (!itimecode.includes('.'))
									itimecode += '.0';
								// @ts-ignore
								let lerp = Math.getLerp(kf.time, next_keyframe.time, time);
								let value = [0, 1, 2].map(axis => {
									return kf.getBezierLerp(kf, next_keyframe, getAxisLetter(axis), lerp);
								})
								interpolated_values[itimecode] = value;
							}
							// Optimize data
							let itimecodes = Object.keys(interpolated_values);
							let skipped = 0;
							let threshold = channel == 'scale' ? 0.005 : (channel == 'rotation' ? 0.1 : 0.01);
							itimecodes.forEach((itimecode, ti) => {
								let value = interpolated_values[itimecode];
								let last = interpolated_values[itimecodes[ti - 1]] || bone_tag[channel][timecode];
								let next = interpolated_values[itimecodes[ti + 1]];
								if (!next)
									return;
								let max_diff = 0;
								let all_axes_irrelevant = value.allAre((val, axis) => {
									let diff = Math.abs((last[axis] - val) - (val - next[axis]));
									max_diff = Math.max(max_diff, diff);
									return diff < threshold
								})
								// @ts-ignore
								if (all_axes_irrelevant && skipped < Math.clamp(2 * (threshold / max_diff), 0, 12)) {
									skipped++;
								} else {
									bone_tag[channel][itimecode] = value;
									skipped = 0;
								}
							})
						}
					})


					// Compress keyframes
					let timecodes = Object.keys(bone_tag[channel]);
					if (timecodes.length === 1 && animator[channel][0].data_points.length == 1 && animator[channel][0].interpolation != 'catmullrom') {
						bone_tag[channel] = bone_tag[channel][timecodes[0]];
						if (channel == 'scale' && bone_tag[channel] instanceof Array && bone_tag[channel].allEqual(bone_tag[channel][0])) {
							bone_tag[channel] = bone_tag[channel][0];
						}
					}
					bone_tag[channel].lod_distance = 0.0; // This is needed for Minecraft Legends 
				}
			}
		}
		// Inverse Kinematics
		let ik_samples = anim.sampleIK();
		// @ts-ignore
		let sample_rate = settings.animation_sample_rate.value;
		for (let uuid in ik_samples) {
			// @ts-ignore
			let group = new OutlinerNode().uuids[uuid];
			var bone_tag: any = ani_tag.bones[group ? group.name : animator.name] = {};
			bone_tag.rotation = {};
			ik_samples[uuid].forEach((rotation, i) => {
				let timecode = trimFloatNumber(Timeline.snapTime(i / sample_rate, anim)).toString();
				if (!timecode.includes('.')) {
					timecode += '.0';
				}
				bone_tag.rotation[timecode] = rotation.array;
			})
		}
		if (Object.keys(ani_tag.bones).length == 0) {
			delete ani_tag.bones;
		}
		// @ts-ignore
		Blockbench.dispatchEvent('compile_minecraft_legends_animation', { animation: anim, json: ani_tag });
		return ani_tag;
	}
})();