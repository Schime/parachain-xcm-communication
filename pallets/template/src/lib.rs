#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

pub mod weights;

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;


#[frame::pallet(dev_mode)]
pub mod pallet {
	use frame::prelude::*;
	use scale_info::prelude::vec::Vec;
	use polkadot_sdk::staging_xcm::latest::{prelude::*, SendXcm,};
	use scale_info::prelude::vec;
	use codec::Encode;


	#[pallet::config]
	pub trait Config: frame_system::Config {
		type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

		/// A type representing the weights required by the dispatchables of this pallet.
		type WeightInfo: crate::weights::WeightInfo;

		/// Maximum bytes allowed for a student's name
		#[pallet::constant]
    	type MaxNameLen: Get<u32>;

		/// Maximum bytes allowed for surname
		#[pallet::constant]
		type MaxSurnameLen: Get<u32>;

		type XcmSender: SendXcm;

		type RuntimeCall: From<Call<Self>> + Encode;

		#[pallet::constant]
		type GraduationDestinationPara: Get<u32>;
	}


	#[pallet::pallet]
	pub struct Pallet<T>(_);

	
	#[derive(
		Encode, Decode, MaxEncodedLen, TypeInfo, CloneNoBound, PartialEqNoBound, DefaultNoBound,
	)]
	#[scale_info(skip_type_params(T))]
	pub struct CompositeStruct<T: Config> {
		/// A block number.
		pub(crate) block_number: BlockNumberFor<T>,
	}


	#[derive(
    Encode, Decode, DecodeWithMemTracking, MaxEncodedLen, TypeInfo,
    Clone, PartialEq, Eq, Debug, Default,
	)]
	pub enum Gender {
		#[default]
		Male,
		Female,
		Other,
	}


	// Defining Student structure
	#[derive(
		Encode, Decode, MaxEncodedLen,  DecodeWithMemTracking, TypeInfo,
		CloneNoBound, PartialEqNoBound, DebugNoBound, Default,
	)]
	#[scale_info(skip_type_params(T))]
	pub struct Student<T: Config> {
		pub name: BoundedVec<u8, T::MaxNameLen>,
		pub surname: BoundedVec<u8, T::MaxSurnameLen>,
		pub age: u32,
		pub gender: Gender,
		pub has_graduated: bool,
	}


	/// Stores a Student for each account
	#[pallet::storage]
	pub type StudentCount<T> = StorageValue<_, u32, ValueQuery>;

	#[pallet::storage]
	pub type Students<T: Config> =
		StorageMap<_, Blake2_128Concat, u32, Student<T>, OptionQuery>;

	#[pallet::storage]
	pub type StudentsByOwner<T: Config> = StorageMap<
		_,
		Blake2_128Concat,
		T::AccountId,
		BoundedVec<u32, ConstU32<100>>, // max 100 students per account
		ValueQuery,
	>;


	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		SomethingStored { block_number: BlockNumberFor<T>, who: T::AccountId },

		StudentCreated { who: T::AccountId },
		StudentDeleted { who: T::AccountId, student_id: u32 },

		XcmMessageSent { destination: Location },
		StudentReceived { student_id: u32 },
		StudentTransferred { student_id: u32, destination: Location },
		StudentGraduatedAndTransferred { who: T::AccountId, student_id: u32, destination: Location },
		StudentUpdated { who: T::AccountId, student_id: u32 },
		StudentDeletedByAdmin { student_id: u32 },
	}


	#[pallet::error]
	pub enum Error<T> {
		NoneValue,
		StorageOverflow,
		NameTooLong,
		SurnameTooLong,
		StudentAlreadyExists,
		MaxStudentsReached,
		StudentNotFound,
		NotStudentOwner,
		AlreadyGraduated,
		XcmSendFailed,
	}

	
	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {}

	
	#[pallet::call]
	impl<T: Config> Pallet<T> {

		// CREATE STUDENT
		#[pallet::call_index(0)]
		#[pallet::weight(10_000)]
		pub fn create_student(
			origin: OriginFor<T>,
			name: Vec<u8>,
			surname: Vec<u8>,
			age: u32,
			gender: Gender,
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			// Convert name → bounded
			let name: BoundedVec<_, T::MaxNameLen> =
				name.try_into().map_err(|_| Error::<T>::NameTooLong)?;

			let surname: BoundedVec<_, T::MaxSurnameLen> =
				surname.try_into().map_err(|_| Error::<T>::SurnameTooLong)?;

			// Generate new student ID
			let student_id = StudentCount::<T>::get();
			StudentCount::<T>::put(student_id + 1);

			// Build student struct
			let student = Student::<T> {
				name,
				surname,
				age,
				gender,
				has_graduated: false,
			};

			// Insert into Students map
			Students::<T>::insert(student_id, student);

			// Add student's ID into student's owner list
			StudentsByOwner::<T>::try_mutate(&who, |list| {
				list.try_push(student_id)
					.map_err(|_| Error::<T>::MaxStudentsReached)
			})?;

			Ok(())
		}


		// GRADUATE STUDENT
		#[pallet::call_index(1)]
		#[pallet::weight(10_000)]
		pub fn graduate_student(
			origin: OriginFor<T>,
			student_id: u32,
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			// Ensure the caller owns this student
			let owned_ids = StudentsByOwner::<T>::get(&who);
			ensure!(owned_ids.contains(&student_id), Error::<T>::NotStudentOwner);

			// Get the student and ensure they exist
			let mut student = Students::<T>::get(student_id)
				.ok_or(Error::<T>::StudentNotFound)?;

			// Ensure student is not already graduated
			ensure!(!student.has_graduated, Error::<T>::AlreadyGraduated);

			// Mark as graduated
			student.has_graduated = true;

			// Prepare XCM transfer to destination parachain
			let dest_para_id = T::GraduationDestinationPara::get();
			let destination = Location::new(1, [Parachain(dest_para_id)]);

			// Encode the receive_student call WITH the owner
			let call = <T as Config>::RuntimeCall::from(
				Call::<T>::receive_student { 
					student: student.clone(),
					new_owner: who.clone() // Pass the current owner
				}
			).encode();

			// Build XCM message
			let message = Xcm(vec![
				UnpaidExecution {
					weight_limit: WeightLimit::Unlimited,
					check_origin: None,
				},
				Transact {
					origin_kind: OriginKind::SovereignAccount,
					fallback_max_weight: Some(Weight::from_parts(1_000_000_000, 64 * 1024)),
					call: call.into(),
				},
			]);

			// Send XCM message
			polkadot_sdk::staging_xcm::latest::send_xcm::<T::XcmSender>(
				destination.clone(),
				message,
			)
			.map_err(|_| Error::<T>::XcmSendFailed)?;

			// Remove student from this parachain after successful transfer
			StudentsByOwner::<T>::try_mutate(&who, |owned_ids| {
				if let Some(index) = owned_ids.iter().position(|id| *id == student_id) {
					owned_ids.swap_remove(index);
					Ok(())
				} else {
					Err(Error::<T>::NotStudentOwner)
				}
			})?;

			Students::<T>::remove(student_id);

			Self::deposit_event(Event::StudentGraduatedAndTransferred { 
				who, 
				student_id, 
				destination 
			});

			Ok(())
		}


		// DELETE STUDENT
		#[pallet::call_index(2)]
		#[pallet::weight(10_000)]
		pub fn delete_student(
			origin: OriginFor<T>,
			student_id: u32,
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			// Ensure the student exists
			let exists = Students::<T>::contains_key(student_id);
			ensure!(exists, Error::<T>::StudentNotFound);

			// Ensure the caller owns this student
			StudentsByOwner::<T>::try_mutate(&who, |owned_ids| {
				if let Some(index) = owned_ids.iter().position(|id| *id == student_id) {
					owned_ids.swap_remove(index); // efficient removal
					Ok(())
				} else {
					Err(Error::<T>::NotStudentOwner)
				}
			})?;

			// Remove the student record
			Students::<T>::remove(student_id);

			// Emit event
			Self::deposit_event(Event::StudentDeleted { who, student_id });

			Ok(())
		}


		// RECEIVE STUDENT (is not called by user)
		#[pallet::call_index(5)]
		#[pallet::weight(10_000)]
		pub fn receive_student(
			origin: OriginFor<T>,
			student: Student<T>,
			new_owner: T::AccountId,
		) -> DispatchResult {
			// Ensure SovereignAccount from XCM
			ensure_signed_or_root(origin)?;

			let student_id = StudentCount::<T>::get();
			StudentCount::<T>::put(student_id + 1);

			Students::<T>::insert(student_id, student);

			// Add to new owner's list
			StudentsByOwner::<T>::try_mutate(&new_owner, |list| {
				list.try_push(student_id)
					.map_err(|_| Error::<T>::MaxStudentsReached)
			})?;

			Self::deposit_event(Event::StudentReceived { student_id });

			Ok(())
		}


		// UPDATE STUDENT
		#[pallet::call_index(4)]
		#[pallet::weight(10_000)]
		pub fn update_student(
			origin: OriginFor<T>,
			student_id: u32,
			name: Vec<u8>,
			surname: Vec<u8>,
			age: u32,
			gender: Gender,
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			// Ensure the caller owns this student
			let owned_ids = StudentsByOwner::<T>::get(&who);
			ensure!(owned_ids.contains(&student_id), Error::<T>::NotStudentOwner);

			// Get the student and ensure they exist
			let mut student = Students::<T>::get(student_id)
				.ok_or(Error::<T>::StudentNotFound)?;

			// Convert name and surname to bounded vecs
			let name: BoundedVec<_, T::MaxNameLen> =
				name.try_into().map_err(|_| Error::<T>::NameTooLong)?;
			let surname: BoundedVec<_, T::MaxSurnameLen> =
				surname.try_into().map_err(|_| Error::<T>::SurnameTooLong)?;

			// Update student fields
			student.name = name;
			student.surname = surname;
			student.age = age;
			student.gender = gender;

			// Save updated student
			Students::<T>::insert(student_id, student);

			// Emit event
			Self::deposit_event(Event::StudentUpdated { who, student_id });

			Ok(())
		}


		// DELETE ANY STUDENT (admin only - for received students)
		#[pallet::call_index(6)]
		#[pallet::weight(10_000)]
		pub fn delete_any_student(
			origin: OriginFor<T>,
			student_id: u32,
		) -> DispatchResult {
			ensure_signed_or_root(origin)?;

			// Ensure the student exists
			ensure!(Students::<T>::contains_key(student_id), Error::<T>::StudentNotFound);

			// Remove the student record
			Students::<T>::remove(student_id);

			// Try to remove from owner's list if they have an owner
			// This iterates through all possible owners - not efficient but works for small datasets
			for (owner, mut owned_ids) in StudentsByOwner::<T>::iter() {
				if let Some(index) = owned_ids.iter().position(|id| *id == student_id) {
					owned_ids.swap_remove(index);
					StudentsByOwner::<T>::insert(&owner, owned_ids);
					break;
				}
			}

			Self::deposit_event(Event::StudentDeletedByAdmin { student_id });

			Ok(())
		}
	}
}